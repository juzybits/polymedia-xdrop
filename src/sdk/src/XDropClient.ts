import { SuiClient, SuiObjectResponse, SuiParsedData, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { NetworkName, objResToContent, SignTransaction, SuiClientBase, WaitForTxOptions } from "@polymedia/suitcase-core";
import { XDropModule } from "./XDropFunctions";
import { getLinkType, LinkNetwork } from "./config";

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
        network: LinkNetwork,
    ) {
        const objs: SuiParsedData[] = [];
        let cursor: string|null|undefined = null;
        let hasNextPage = true;
        while (hasNextPage) {
            const resp = await this.suiClient.getOwnedObjects({
                owner,
                cursor,
                options: { showContent: true },
                filter: { StructType: getLinkType(this.suilinkPkgId, network) },
            });
            for (const obj of resp.data) {
                objs.push(objResToContent(obj));
            }
            cursor = resp.nextCursor;
            hasNextPage = resp.hasNextPage;
        }
        return objs;
    }

    // === data parsing ===

    // === module interactions ===
}
