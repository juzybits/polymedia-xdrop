import { Keypair } from "@mysten/sui/cryptography";

import { formatBalance } from "@polymedia/suitcase-core";
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

/**
 * Generate a random Ethereum-like address (for development purposes only).
 * Returns a string that looks like an Ethereum address (0x + 40 hex chars),
 * but is not cryptographically valid.
 */
export function generateRandomEthereumAddress(): string {
    const HEX_LENGTH = 40; // length without '0x' prefix
    return "0x" + Array.from(
        { length: HEX_LENGTH },
        () => Math.floor(Math.random() * 16).toString(16)
    ).join("");
}

/**
 * Generate a random Solana-like address (for development purposes only).
 * Returns a string that looks like a Solana address (44 Base58 chars),
 * but is not cryptographically valid.
 */
export function generateRandomSolanaAddress(): string {
    const VALID_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const ADDRESS_LENGTH = 44;
    return Array.from(
        { length: ADDRESS_LENGTH },
        () => VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)]
    ).join("");
}
