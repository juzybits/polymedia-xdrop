import { getFullnodeUrl, SuiClient, SuiTransactionBlockResponseOptions } from "@mysten/sui/client";
import { NetworkName, SignTransaction, SuiClientBase, WaitForTxOptions } from "@polymedia/suitcase-core";

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

    // === data parsing ===

    // === module interactions ===
}
