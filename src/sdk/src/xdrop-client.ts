import { bcs } from "@mysten/sui/bcs";
import {
    SuiClient,
    SuiTransactionBlockResponse,
    SuiTransactionBlockResponseOptions,
} from "@mysten/sui/client";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { graphql } from '@mysten/sui/graphql/schemas/latest';
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import {
    chunkArray,
    devInspectAndGetReturnValues,
    ObjChangeKind,
    SignTransaction,
    SuiClientBase,
    TransferModule,
    TxErrorParser,
    WaitForTxOptions
} from "@polymedia/suitcase-core";
import { ERRORS_CODES } from "./config.js";
import { getSuiLinkNetworkType, getSuiLinkType, LinkNetwork } from "./suilink.js";
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
import { extractXDropObjCreated } from "./xdrop-txs.js";

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
    public readonly graphClient: SuiGraphQLClient;
    public readonly xdropPkgId: string;
    public readonly suilinkPkgId: string;
    public readonly errParser: TxErrorParser;

    constructor(args: {
        graphClient: SuiGraphQLClient;
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
        this.graphClient = args.graphClient;
        this.xdropPkgId = args.xdropPkgId;
        this.suilinkPkgId = args.suilinkPkgId;
        this.errParser = new TxErrorParser(args.xdropPkgId, ERRORS_CODES);
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

    public async fetchCreatedXDrops(
        sender: string,
        limit: number,
        cursor: string | null | undefined,
    ) {
        const result = await this.graphClient.query({
            query: graphql(`
                query($limit: Int!, $cursor: String, $sender: SuiAddress!, $eventType: String!) {
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
                limit, cursor, sender, eventType: `${this.xdropPkgId}::xdrop::EventShare`,
            }
        });

        if (result.errors) {
            throw new Error(`[fetchCreatedXDrops] GraphQL error: ${JSON.stringify(result.errors, null, 2)}`);
        }
        const data = result.data;
        if (!data) {
            throw new Error(`[fetchCreatedXDrops] GraphQL returned no data`);
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
     * IMPORTANT: Ethereum addresses must be lowercase.
     */
    public async adminAddsClaims(
        sender: string,
        xdrop: XDropIdentifier,
        claims: { foreignAddr: string, amount: bigint }[],
    ): Promise<SuiTransactionBlockResponse[]>
    {
        const resps: SuiTransactionBlockResponse[] = [];

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
            const resp = await this.signAndExecuteTx(tx);
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

}
