import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiTransactionBlockResponse, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
    devInspectAndGetReturnValues,
    getCoinOfValue,
    NetworkName,
    ObjChangeKind,
    SignTransaction,
    SuiClientBase,
    TransferModule,
    WaitForTxOptions,
} from "@polymedia/suitcase-core";
import { getLinkType, LinkNetwork } from "./config.js";
import { XDropModule } from "./xdrop-functions.js";
import { ClaimStatus, ClaimStatusBcs, objResToSuiLink, SuiLink } from "./xdrop-structs.js";

/**
 * Execute transactions on the XDrop Sui package.
 */
export class XDropClient extends SuiClientBase
{
    public readonly network: NetworkName;
    public readonly xdropPkgId: string;
    public readonly suilinkPkgId: string;

    constructor(args: {
        network: NetworkName;
        xdropPkgId: string;
        suilinkPkgId: string;
        suiClient: SuiClient;
        signTransaction: SignTransaction;
        waitForTxOptions?: WaitForTxOptions;
        txResponseOptions?: SuiTransactionBlockResponseOptions;
    }) {
        super({
            suiClient: args.suiClient,
            signTransaction: args.signTransaction,
            waitForTxOptions: args.waitForTxOptions,
            txResponseOptions: args.txResponseOptions,
        });
        this.network = args.network;
        this.xdropPkgId = args.xdropPkgId;
        this.suilinkPkgId = args.suilinkPkgId;
    }

    // === data fetching ===

    public async fetchOwnedLinks(
        owner: string,
        linkNetwork: LinkNetwork,
    ): Promise<SuiLink[]>
    {
        const links: SuiLink[] = [];
        let cursor: string|null|undefined = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const resp = await this.suiClient.getOwnedObjects({
                owner,
                cursor,
                options: { showContent: true },
                filter: { StructType: getLinkType(this.suilinkPkgId, linkNetwork, "outer") },
            });
            for (const objRes of resp.data) {
                links.push(objResToSuiLink(objRes));
            }
            cursor = resp.nextCursor;
            hasNextPage = resp.hasNextPage;
        }
        return links;
    }

    public async fetchClaimStatuses(
        typeCoin: string,
        linkNetwork: LinkNetwork,
        xdropId: string,
        addrs: string[],
    ): Promise<ClaimStatus[]>
    {
        const tx = new Transaction();

        XDropModule.get_claim_statuses(
            tx,
            this.xdropPkgId,
            typeCoin,
            getLinkType(this.suilinkPkgId, linkNetwork, "inner"),
            xdropId,
            addrs.map(addr => addr.toLowerCase()),
        );

        const blockReturns = await devInspectAndGetReturnValues(
            this.suiClient, tx, [ [ bcs.vector(ClaimStatusBcs) ] ]
        );

        return blockReturns[0][0].map((status: any) => ({
            eligible: Boolean(status.eligible),
            claimed: Boolean(status.claimed),
            amount: BigInt(status.amount),
        }));
    }

    // === data parsing ===

    // === module interactions ===

    public async adminCreatesAndSharesXDrop(
        typeCoin: string,
        linkNetwork: LinkNetwork,
        infoJson: string,
    ): Promise<{
        resp: SuiTransactionBlockResponse;
        xdropObjChange: ObjChangeKind<"created">;
    }> {
        const tx = new Transaction();

        const typeLink = getLinkType(this.suilinkPkgId, linkNetwork, "inner");

        const [xdropArg] = XDropModule.admin_creates_xdrop(
            tx, this.xdropPkgId, typeCoin, typeLink, infoJson
        );

        TransferModule.public_share_object(
            tx,
            `${this.xdropPkgId}::xdrop::XDrop<${typeCoin},${typeLink}>`,
            xdropArg,
        );

        const resp = await this.signAndExecuteTransaction(tx);

        const xdropObjChange = this.extractXDropObjCreated(resp);
        if (!xdropObjChange) {
            throw new Error(`Transaction succeeded but no XDrop object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        return { resp, xdropObjChange };
    }

    public async adminAddsClaims( // TODO test limits
        sender: string,
        typeCoin: string,
        linkNetwork: LinkNetwork,
        xdropId: string,
        addrs: string[],
        amounts: bigint[],
    ) {
        const tx = new Transaction();
        const totalAmount = amounts.reduce((a, b) => a + b, 0n);
        const [payCoinArg] = await getCoinOfValue(this.suiClient, tx, sender, typeCoin, totalAmount);

        XDropModule.admin_adds_claims(
            tx,
            this.xdropPkgId,
            typeCoin,
            getLinkType(this.suilinkPkgId, linkNetwork, "inner"),
            xdropId,
            payCoinArg,
            addrs.map(addr => addr.toLowerCase()),
            amounts,
        );

        return await this.signAndExecuteTransaction(tx);
    }

    public async adminOpensXDrop(
        typeCoin: string,
        linkNetwork: LinkNetwork,
        xdropId: string,
    ) {
        const tx = new Transaction();

        XDropModule.admin_opens_xdrop(
            tx,
            this.xdropPkgId,
            typeCoin,
            getLinkType(this.suilinkPkgId, linkNetwork, "inner"),
            xdropId,
        );

        return await this.signAndExecuteTransaction(tx);
    }

    public async userClaims(
        sender: string,
        typeCoin: string,
        linkNetwork: LinkNetwork,
        xdropId: string,
        linkIds: string[],
    ) {
        const tx = new Transaction();

        for (const linkId of linkIds) {
            const [claimed_coin] = XDropModule.user_claims(
                tx,
                this.xdropPkgId,
                typeCoin,
                getLinkType(this.suilinkPkgId, linkNetwork, "inner"),
                xdropId,
                linkId,
            );
            TransferModule.public_transfer(
                tx,
                `0x2::coin::Coin<${typeCoin}>`,
                claimed_coin,
                sender,
            );
        }

        return await this.signAndExecuteTransaction(tx);
    }

    // === object extractors ===

    /**
     * Extract the created XDrop object (if any) from `SuiTransactionBlockResponse.objectChanges`.
     */
    public extractXDropObjCreated(
        resp: SuiTransactionBlockResponse,
    ): ObjChangeKind<"created"> | undefined
    {
        return resp.objectChanges?.find(o =>
            o.type === "created" && o.objectType.startsWith(`${this.xdropPkgId}::xdrop::XDrop<`)
        ) as ObjChangeKind<"created"> | undefined;
    }

    // === helpers ===

    public async signAndExecuteTransaction(
        tx: Transaction,
        waitForTxOptions: WaitForTxOptions | false = this.waitForTxOptions,
        txResponseOptions: SuiTransactionBlockResponseOptions = this.txResponseOptions,
    ): Promise<SuiTransactionBlockResponse> {
        const resp = await super.signAndExecuteTransaction(
            tx, waitForTxOptions, txResponseOptions
        );
        if (!resp.effects?.status.status) {
            throw new Error(`Transaction failed: ${JSON.stringify(resp, null, 2)}`);
        }
        return resp;
    }
}
