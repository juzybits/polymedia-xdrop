import { bcs } from "@mysten/sui/bcs";
import {
    SuiClient,
    SuiTransactionBlockResponse,
    SuiTransactionBlockResponseOptions,
} from "@mysten/sui/client";
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
import { XDropModule } from "./xdrop-functions.js";
import {
    ClaimStatus,
    ClaimStatusBcs,
    objResToSuiLink,
    objResToXDrop,
    retValToClaimStatus,
    SuiLink,
    XDrop,
    XDropIdentifier,
} from "./xdrop-structs.js";

/**
 * How many claims can be added to an xDrop in a single transaction.
 * @see XDropClient.adminAddsClaims
 */
export const MAX_CLAIMS_ADDED_PER_TX = 1000;

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
        signTx: SignTransaction;
        waitForTxOptions?: WaitForTxOptions;
        txResponseOptions?: SuiTransactionBlockResponseOptions;
    }) {
        super({
            suiClient: args.suiClient,
            signTx: args.signTx,
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
        const linkType = getSuiLinkType(this.suilinkPkgId, linkNetwork);
        let cursor: string|null|undefined = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const resp = await this.suiClient.getOwnedObjects({
                owner,
                cursor,
                options: { showContent: true },
                filter: { StructType: linkType },
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
            getSuiLinkNetworkType(this.suilinkPkgId, linkNetwork),
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
        return this.fetchAndParseObjs<XDrop>(
            xdropIds,
            (ids) => this.suiClient.multiGetObjects({
                ids, options: { showContent: true }
            }),
            objResToXDrop,
        );
    }

    // === data parsing ===

    // === module interactions ===

    /**
     * Create a new XDrop, share it, and return the created object as a `SuiObjectChange`.
     */
    public async adminCreatesAndSharesXDrop(
        typeCoin: string,
        linkNetwork: LinkNetwork,
    ): Promise<{
        resp: SuiTransactionBlockResponse;
        xdropObjChange: ObjChangeKind<"created">;
    }> {
        const tx = new Transaction();

        const networkType = getSuiLinkNetworkType(this.suilinkPkgId, linkNetwork);

        const [xdropArg] = XDropModule.new(
            tx, this.xdropPkgId, typeCoin, networkType
        );

        XDropModule.share(
            tx, this.xdropPkgId, typeCoin, networkType, xdropArg
        );

        const resp = await this.signAndExecuteTx(tx);

        const xdropObjChange = this.extractXDropObjCreated(resp);
        if (!xdropObjChange) {
            throw new Error(`Transaction succeeded but no XDrop object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        return { resp, xdropObjChange };
    }

    /**
     * Add claims to an XDrop. Does multiple transactions if needed.
     * IMPORTANT: Ethereum addresses must be lowercase.
     */
    public async adminAddsClaims(
        sender: string,
        xdrop: XDropIdentifier,
        claims: { foreignAddr: string, amount: bigint }[],
    ) {
        const result: {
            resps: SuiTransactionBlockResponse[];
            addedAddrs: string[];
        } = { resps: [], addedAddrs: [] };

        // Create up to 1000 dynamic object fields in 1 tx (`object_runtime_max_num_store_entries`);
        const maxClaimsPerTx = MAX_CLAIMS_ADDED_PER_TX;
        // Function args size must be under 16384 bytes (`SizeLimitExceeded`/ `maximum pure argument size`)
        const maxClaimsPerFnCall = 350; // breaks above 380 (devnet, 2024-11-29)

        const claimsByTx = chunkArray(claims, maxClaimsPerTx);
        for (const [txNum, txClaims] of claimsByTx.entries())
        {
            console.debug(`[adminAddsClaims] starting tx ${txNum + 1} of ${claimsByTx.length}`);
            const tx = new Transaction();
            tx.setSender(sender);

            const claimsByFnCall = chunkArray(txClaims, maxClaimsPerFnCall);
            for (const [callNum, callClaims] of claimsByFnCall.entries())
            {
                console.debug(`[adminAddsClaims] adding fn call ${callNum + 1} of ${claimsByFnCall.length}`);
                const chunkTotalAmount = callClaims.reduce((sum, c) => sum + c.amount, 0n);

                XDropModule.admin_adds_claims(
                    tx,
                    this.xdropPkgId,
                    xdrop.type_coin,
                    xdrop.type_network,
                    xdrop.id,
                    coinWithBalance({ balance: chunkTotalAmount, type: xdrop.type_coin })(tx),
                    callClaims.map(c => c.foreignAddr),
                    callClaims.map(c => c.amount),
                );
            }

            try {
                const resp = await this.signAndExecuteTx(tx);
                result.resps.push(resp);
                result.addedAddrs.push(...txClaims.map(c => c.foreignAddr));
            } catch (err) {
                console.warn(`[adminAddsClaims] tx ${txNum + 1} failed:`, err);
                break;
            }
        }

        return result;
    }

    public async userClaims(
        sender: string,
        xdrop: XDropIdentifier,
        linkIds: string[],
    ) {
        const tx = new Transaction();

        for (const linkId of linkIds) {
            const [claimed_coin] = XDropModule.user_claims(
                tx,
                this.xdropPkgId,
                xdrop.type_coin,
                xdrop.type_network,
                xdrop.id,
                linkId,
            );
            TransferModule.public_transfer(
                tx,
                `0x2::coin::Coin<${xdrop.type_coin}>`,
                claimed_coin,
                sender,
            );
        }

        return await this.signAndExecuteTx(tx);
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
}

// === SuiLink ===

export const LINK_NETWORKS = ["ethereum", "solana"] as const;

export type LinkNetwork = (typeof LINK_NETWORKS)[number];

/**
 * Get the type of a SuiLink object. E.g. `0x123::suilink::SuiLink<0x123::solana::Solana>`
 */
export function getSuiLinkType(
    pkgId: string,
    network: LinkNetwork,
): string
{
    const networkType = getSuiLinkNetworkType(pkgId, network);
    return `${pkgId}::suilink::SuiLink<${networkType}>`;
}

/**
 * Get the network type of a SuiLink object. E.g. `0x123::solana::Solana`
 */
export function getSuiLinkNetworkType(
    pkgId: string,
    network: LinkNetwork,
): string
{
    const moduleAndStruct = network === "ethereum" ? "ethereum::Ethereum" : "solana::Solana";
    return `${pkgId}::${moduleAndStruct}`;
}
