import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiTransactionBlockResponse, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { graphql } from "@mysten/sui/graphql/schemas/latest";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

import { chunkArray, devInspectAndGetReturnValues, ObjChangeKind, SignTx, SuiClientBase, TransferModule, TxErrorParser, WaitForTxOptions , fetchDynamicFields } from "@polymedia/suitcase-core";

import { ERRORS } from "./config.js";
import { serialBatchesOfParallelOperations } from "./misc.js";
import { getSuiLinkNetworkType, getSuiLinkType, LinkNetwork } from "./suilink.js";
import { XDropModule } from "./xdrop-functions.js";
import { EligibleStatus, EligibleStatusBcs, objResToSuiLink, objResToXDrop, retValToEligibleStatus, SuiLink, XDrop, XDropEventName, XDropIdentifier } from "./xdrop-structs.js";
import { calculateFee, extractXDropObjCreated } from "./xdrop-txs.js";

const MAX_PARALLEL_RPC_CALLS = 20;

/**
 * How many claims can be added to an xDrop in a single transaction.
 *
 * object_runtime_max_num_store_entries (reached in admin_adds_claims) and
 * object_runtime_max_num_cached_objects (reached in get_eligible_statuses)
 * are both 1000.
 */
export const MAX_OBJECTS_PER_TX = 1000;

/**
 * How many addresses can be passed to a single function call.
 *
 * Maximum function args size is 16384 bytes (`max_pure_argument_size`).
 */
export const MAX_ADDRS_PER_FN = 350; // breaks at 381 addresses (2024-11-29)

/**
 * Execute transactions on the XDrop Sui package.
 */
export class XDropClient extends SuiClientBase
{
    public readonly graphClient: SuiGraphQLClient;
    public readonly xdropPkgId: string;
    public readonly suilinkPkgId: string;
    protected readonly errParser: TxErrorParser;

    constructor(args: {
        graphClient: SuiGraphQLClient;
        xdropPkgId: string;
        suilinkPkgId: string;
        suiClient: SuiClient;
        signTx: SignTx;
        waitForTxOptions?: WaitForTxOptions;
        txResponseOptions?: SuiTransactionBlockResponseOptions;
    }) {
        super({
            suiClient: args.suiClient,
            signTx: args.signTx,
            waitForTxOptions: args.waitForTxOptions,
            txResponseOptions: args.txResponseOptions,
        });
        this.graphClient = args.graphClient;
        this.xdropPkgId = args.xdropPkgId;
        this.suilinkPkgId = args.suilinkPkgId;
        this.errParser = new TxErrorParser(args.xdropPkgId, ERRORS);
    }

    // === data fetching ===

    /**
     * Fetch the foreign addresses of all claims in an xDrop.
     * These addresses are strings and correspond to DOF keys.
     */
    public async fetchClaimAddrs(
        claimsTableId: string,
        limit: number,
    ) {
        const { data, hasNextPage, cursor } = await fetchDynamicFields({
            client: this.suiClient,
            parentId: claimsTableId,
            limit,
        });

        const addrs = data
            .filter(dof => dof.objectType === `${this.xdropPkgId}::xdrop::Claim`)
            .map(dof => String(dof.name.value));

        return { addrs, hasNextPage, cursor };
    }

    public async fetchOneCleanerCapId(
        owner: string,
    ): Promise<string | null> {
        const resp = await this.suiClient.getOwnedObjects({
            owner,
            options: { showContent: true },
            filter: { StructType: `${this.xdropPkgId}::xdrop::CleanerCap` },
            limit: 1,
        });
        for (const objRes of resp.data) {
            return objRes.data!.objectId;
        }
        return null;
    }

    public async fetchEligibleStatuses({
        typeCoin, linkNetwork, xdropId, addrs, onUpdate
    }: {
        typeCoin: string;
        linkNetwork: LinkNetwork;
        xdropId: string;
        addrs: string[];
        onUpdate?: (msg: string) => unknown;
    }): Promise<EligibleStatus[]>
    {
        const inspectTx = async (txAddrs: string[], _idx: number) =>
        {
            const tx = new Transaction();
            const addrsByFn = chunkArray(txAddrs, MAX_ADDRS_PER_FN);

            for (const fnAddrs of addrsByFn) {
                XDropModule.get_eligible_statuses(
                    tx,
                    this.xdropPkgId,
                    typeCoin,
                    getSuiLinkNetworkType(this.suilinkPkgId, linkNetwork),
                    xdropId,
                    fnAddrs,
                );
            }

            const blockReturns = await devInspectAndGetReturnValues(
                this.suiClient,
                tx,
                Array.from({ length: addrsByFn.length }, () => [bcs.vector(EligibleStatusBcs)])
            );

            const statuses: EligibleStatus[] = [];
            for (const txRet of blockReturns) {
                for (const ret of txRet[0]) {
                    statuses.push(retValToEligibleStatus(ret));
                }
            }
            return statuses;
        };

        const addrsByTx = chunkArray(addrs, MAX_OBJECTS_PER_TX);
        const statusesByTx = await serialBatchesOfParallelOperations(
            MAX_PARALLEL_RPC_CALLS, addrsByTx, inspectTx.bind(this), onUpdate
        );

        return statusesByTx.flat();
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

    public async fetchXDropsByEvent(
        eventType: XDropEventName,
        options: {
            sender?: string;
            cursor?: string | null;
            limit: number;
        }
    ) {
        const result = await this.graphClient.query({
            query: graphql(`
                query($limit: Int!, $cursor: String, $sender: SuiAddress, $eventType: String!) {
                    events(
                        last: $limit
                        before: $cursor
                        filter: {
                            eventType: $eventType
                            sender: $sender
                        }
                    ) {
                        pageInfo {
                            hasPreviousPage
                            startCursor
                        }
                        nodes {
                            transactionBlock { digest }
                            timestamp
                            contents { json }
                        }
                    }
                }
            `),
            variables: {
                limit: options.limit,
                cursor: options.cursor,
                sender: options.sender,
                eventType: `${this.xdropPkgId}::xdrop::${eventType}`,
            }
        });

        if (result.errors) {
            throw new Error(`[fetchXDropsByEvent] GraphQL error: ${JSON.stringify(result.errors, null, 2)}`);
        }
        const data = result.data;
        if (!data) {
            throw new Error("[fetchXDropsByEvent] GraphQL returned no data");
        }

        const events = data.events.nodes
            .map(event => ({
                digest: event.transactionBlock!.digest!,
                timestamp: new Date(event.timestamp!),
                ...event.contents.json as XDropIdentifier,
            }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const xdrops = await this.fetchXDrops(events.map(evt => evt.id));

        const enhancedXDrops = xdrops.map(xdrop => {
            const event = events.find(e => e.id === xdrop.id);
            return {
                ...xdrop,
                digest: event!.digest,
                timestamp: event!.timestamp,
            };
        });

        return {
            hasNextPage: data.events.pageInfo.hasPreviousPage,
            nextCursor: data.events.pageInfo.startCursor,
            data: enhancedXDrops,
        };
    }

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

        const xdropObjChange = extractXDropObjCreated(resp, this.xdropPkgId);
        if (!xdropObjChange) {
            throw new Error(`Transaction succeeded but no XDrop object was found: ${JSON.stringify(resp, null, 2)}`);
        }

        return { resp, xdropObjChange };
    }

    /**
     * Add claims to an XDrop. Does multiple transactions if needed.
     */
    public async adminAddsClaims({
        sender, xdrop, claims, dryRun, fee, onUpdate
    }: {
        sender: string;
        xdrop: XDropIdentifier;
        claims: { foreignAddr: string; amount: bigint }[];
        dryRun?: boolean;
        fee?: { bps: bigint; addr: string };
        onUpdate?: (msg: string) => unknown;
    }): Promise<SuiTransactionBlockResponse[]>
    {
        const resps: SuiTransactionBlockResponse[] = [];
        const claimsByTx = chunkArray(claims, MAX_OBJECTS_PER_TX);
        for (const [txNum, txClaims] of claimsByTx.entries())
        {
            onUpdate?.(`Submitting tx ${txNum + 1} of ${claimsByTx.length}`);
            const tx = new Transaction();
            tx.setSender(sender); // "Sender must be set to resolve CoinWithBalance"

            if (fee) {
                const txFeeAmount = calculateFee(txClaims, fee.bps);
                const txFeeCoin = coinWithBalance({ balance: txFeeAmount, type: xdrop.type_coin })(tx);
                TransferModule.public_transfer(tx, `0x2::coin::Coin<${xdrop.type_coin}>`, txFeeCoin, fee.addr);
            }

            const claimsByFn = chunkArray(txClaims, MAX_ADDRS_PER_FN);
            for (const fnClaims of claimsByFn)
            {
                const chunkTotalAmount = fnClaims.reduce((sum, c) => sum + c.amount, 0n);
                XDropModule.admin_adds_claims(
                    tx,
                    this.xdropPkgId,
                    xdrop.type_coin,
                    xdrop.type_network,
                    xdrop.id,
                    coinWithBalance({ balance: chunkTotalAmount, type: xdrop.type_coin })(tx),
                    fnClaims.map(c => c.foreignAddr),
                    fnClaims.map(c => c.amount),
                );
            }
            const resp = await this.dryRunOrSignAndExecute(tx, dryRun, sender);
            resps.push(resp);
        }
        return resps;
    }

    public async userClaims(
        sender: string,
        xdrop: XDropIdentifier,
        linkIds: string[],
    ): Promise<SuiTransactionBlockResponse>
    {
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

    public async cleanerDeletesClaims({
        cleanerCapId, xdrop, addrs, onUpdate
    }: {
        cleanerCapId: string;
        xdrop: XDropIdentifier;
        addrs: string[];
        onUpdate?: (msg: string) => unknown;
    }): Promise<SuiTransactionBlockResponse[]>
    {
        const resps: SuiTransactionBlockResponse[] = [];
        const addrsByTx = chunkArray(addrs, MAX_OBJECTS_PER_TX);
        for (const [txNum, txAddrs] of addrsByTx.entries())
        {
            onUpdate?.(`Submitting tx ${txNum + 1} of ${addrsByTx.length}`);
            const tx = new Transaction();
            const claimsByFn = chunkArray(txAddrs, MAX_ADDRS_PER_FN);
            for (const fnAddrs of claimsByFn) {
                XDropModule.cleaner_deletes_claims(
                    tx,
                    this.xdropPkgId,
                    xdrop.type_coin,
                    xdrop.type_network,
                    cleanerCapId,
                    xdrop.id,
                    fnAddrs,
                );
            }
            const resp = await this.signAndExecuteTx(tx);
            resps.push(resp);
        }
        return resps;
    }

    // === ergonomics ===

    /**
     * Create a new XDropClient instance with modified parameters
     * while preserving all other settings from the current instance.
     */
    public with(
        overrides: Partial<ConstructorParameters<typeof XDropClient>[0]>
    ): XDropClient {
        return new XDropClient({
            ...this, // eslint-disable-line @typescript-eslint/no-misused-spread
            ...overrides,
        });
    }

    public errToStr(
        ...args: Parameters<typeof TxErrorParser.prototype.errToStr>
    ): string | null
    {
        return this.errParser.errToStr(...args);
    }
}
