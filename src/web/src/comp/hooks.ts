import { useFetch } from "@polymedia/suitcase-react";
import { useAppContext } from "../App";
import { getCoinMeta } from "@polymedia/coinmeta";

export function useXDrop(xdropId: string)
{
    const { xdropClient } = useAppContext();
    return useFetch(async () => {
        const xdrop = await xdropClient.fetchXDrop(xdropId);
        const coinMeta = !xdrop ? null
            : await getCoinMeta(xdropClient.suiClient, xdrop.type_coin);
        return { xdrop, coinMeta };
    }, [xdropId]);
}
