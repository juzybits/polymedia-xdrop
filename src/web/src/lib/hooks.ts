import { CoinMetadata } from "@mysten/sui/client";

import { useInputPrivateKey , useFetch, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";

import { useAppContext } from "../app/context";

export type UseXDropResult = UseFetchResult<{
    xdrop: XDrop | null;
    coinMeta: CoinMetadata | null;
}>;

export function useXDrop(
    xdropId: string,
): UseXDropResult {
    const { xdropClient, coinMetaFetcher } = useAppContext();
    return useFetch(async () => {
        const xdrop = await xdropClient.fetchXDrop(xdropId);
        const coinMeta = !xdrop ? null
            : await coinMetaFetcher.getCoinMeta(xdrop.type_coin);
        return { xdrop, coinMeta };
    }, [xdropClient, xdropId]);
}

/**
 * Input hook for XDrop admin private key validation.
 */
export function useAdminPrivateKey({
    expectedAddr, label, errorMsg,
}: {
    expectedAddr: string;
    label: string;
    errorMsg: string;
}) {
    return useInputPrivateKey({
        label,
        html: {
            value: String(import.meta.env.VITE_PRIVATE_KEY ?? ""),
            placeholder: "suiprivkey...",
        },
        validateValue: (pk) => {
            if (pk.toSuiAddress() !== expectedAddr) {
                return { err: errorMsg, val: undefined };
            }
            return { err: null, val: pk };
        },
    });
}
