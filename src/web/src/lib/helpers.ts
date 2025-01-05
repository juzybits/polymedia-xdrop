import { formatBalance } from "@polymedia/suitcase-core";

export const fmtBal = (balance: bigint, decimals: number, symbol: string) =>
    `${formatBalance(balance, decimals, "compact")} ${symbol}`;
