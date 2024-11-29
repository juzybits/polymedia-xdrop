import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiTransactionBlockResponse, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import {
    chunkArray,
    devInspectAndGetReturnValues,
    NetworkName,
    ObjChangeKind,
    SignTransaction,
    SuiClientBase,
    TransferModule,
    WaitForTxOptions,
} from "@polymedia/suitcase-core";
import { getLinkType, LinkNetwork } from "./config.js";
import { XDropModule } from "./xdrop-functions.js";
import { ClaimStatus, ClaimStatusBcs, objResToSuiLink, objResToXDrop, retValToClaimStatus, SuiLink, XDrop } from "./xdrop-structs.js";

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

        // eslint-disable-next-line
        return blockReturns[0][0].map(retValToClaimStatus);
    }

    public async fetchXDrop(
        xdropId: string,
    ): Promise<XDrop | null>
    {
        const xdrops = await this.fetchXDrops([xdropId]);
        return xdrops.length > 0 ? xdrops[0] : null;
    }

    public async fetchXDrops(
        xdropIds: string[],
    ): Promise<XDrop[]>
    {
        return this.fetchAndParseObjects<XDrop>(
            xdropIds,
            (ids) => this.suiClient.multiGetObjects({
                ids, options: { showContent: true }
            }),
            objResToXDrop,
        );
    }

    // === data parsing ===

    // === module interactions ===

    public async adminCreatesAndSharesXDrop(
        typeCoin: string,
        linkNetwork: LinkNetwork,
    ): Promise<{
        resp: SuiTransactionBlockResponse;
        xdropObjChange: ObjChangeKind<"created">;
    }> {
        const tx = new Transaction();

        const typeLink = getLinkType(this.suilinkPkgId, linkNetwork, "inner");

        const [xdropArg] = XDropModule.new(
            tx, this.xdropPkgId, typeCoin, typeLink
        );

        XDropModule.share(
            tx, this.xdropPkgId, typeCoin, typeLink, xdropArg
        );

        const resp = await this.signAndExecuteTransaction(tx);

        const xdropObjChange = this.extractXDropObjCreated(resp);
        if (!xdropObjChange) {
            throw new Error(`Transaction succeeded but no XDrop object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        return { resp, xdropObjChange };
    }

    public async adminAddsClaims(
        sender: string,
        typeCoin: string,
        linkNetwork: LinkNetwork,
        xdropId: string,
        addrs: string[],
        amounts: bigint[],
    ) {
        const tx = new Transaction();
        tx.setSender(sender);

        if (addrs.length !== amounts.length) {
            throw new Error(`Number of addresses and amounts must match: ${addrs.length} !== ${amounts.length}`);
        }
        if (addrs.length > 1000) {
            throw new Error(`Number of claims must be less than 1000 (object_runtime_max_num_store_entries)`);
        }

        // Keep function call arg size below 16384 bytes due to:
        // `SizeLimitExceeded { limit: "maximum pure argument size", value: "16384" }`
        const chunkSize = 380; // breaks above this (devnet, 2024-11-29)

        for (let i = 0; i < addrs.length; i += chunkSize) {
            const chunkAddrs = addrs.slice(i, i + chunkSize);
            const chunkAmounts = amounts.slice(i, i + chunkSize);
            const chunkTotalAmount = chunkAmounts.reduce((sum, amt) => sum + amt, 0n);

            XDropModule.admin_adds_claims(
                tx,
                this.xdropPkgId,
                typeCoin,
                getLinkType(this.suilinkPkgId, linkNetwork, "inner"),
                xdropId,
                coinWithBalance({ balance: chunkTotalAmount, type: typeCoin })(tx),
                chunkAddrs.map(addr => addr.toLowerCase()),
                chunkAmounts,
            );
        }

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
