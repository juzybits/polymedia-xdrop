import { CoinMetadata } from "@mysten/sui/client";

import { useFetch, UseFetchResult } from "@polymedia/suitcase-react";
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
