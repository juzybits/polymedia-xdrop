import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiTransactionBlockResponse, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
    devInspectAndGetReturnValues,
    getCoinOfValue,
    NetworkName,
    ObjChangeKind,
    objResToFields,
    SignTransaction,
    SuiClientBase,
    TransferModule,
    WaitForTxOptions,
} from "@polymedia/suitcase-core";
import { XDropModule } from "./xdrop-functions";
import { getLinkType, LinkNetwork } from "./config";
import { SuiLink } from "./xdrop-structs";

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
    ): Promise<SuiLink[]> {
        const objs: Record<string, any>[] = [];
        let cursor: string|null|undefined = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const resp = await this.suiClient.getOwnedObjects({
                owner,
                cursor,
                options: { showContent: true },
                filter: { StructType: getLinkType(this.suilinkPkgId, linkNetwork) },
            });
            for (const obj of resp.data) {
                objs.push(objResToFields(obj));
            }
            cursor = resp.nextCursor;
            hasNextPage = resp.hasNextPage;
        }
        return objs.map(o => ({
            id: o.id.id,
            network_address: o.network_address,
            timestamp_ms: o.timestamp_ms,
        }));
    }

    public async getClaimableAmounts(
        typeCoin: string,
        linkNetwork: LinkNetwork,
        xdropId: string,
        addrs: string[],
    ): Promise<bigint[]> {
        const tx = new Transaction();

        XDropModule.get_claimable_amounts(
            tx,
            this.xdropPkgId,
            typeCoin,
            getLinkType(this.suilinkPkgId, linkNetwork),
            xdropId,
            addrs,
        );

        const blockReturns = await devInspectAndGetReturnValues(
            this.suiClient, tx, [ [ bcs.vector(bcs.option(bcs.U64)) ] ]
        );

        return blockReturns[0][0] as bigint[];
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

        const typeLink = getLinkType(this.suilinkPkgId, linkNetwork);

        const [xdropArg] = XDropModule.admin_creates_xdrop(
            tx, this.xdropPkgId, typeCoin, typeLink
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
            getLinkType(this.suilinkPkgId, linkNetwork),
            xdropId,
            payCoinArg,
            addrs,
            amounts,
        );

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
