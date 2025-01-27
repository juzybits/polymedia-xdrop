import { Keypair } from "@mysten/sui/cryptography";

import { formatBalance, pairFromSecretKey } from "@polymedia/suitcase-core";
import { XDropClient } from "@polymedia/xdrop-sdk";

export function fmtBal(balance: bigint, decimals: number, symbol: string) {
    return `${formatBalance(balance, decimals, "compact")} ${symbol}`;
}

export function clientWithKeypair(client: XDropClient, pair: Keypair)
{
    return client.with({
        signTx: async (tx) => {
            tx.setSenderIfNotSet(pair.toSuiAddress());
            const txBytes = await tx.build({ client: client.suiClient });
            return pair.signTransaction(txBytes);
        },
    });
}
