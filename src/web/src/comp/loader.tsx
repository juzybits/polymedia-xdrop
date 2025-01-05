import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { getCoinMeta } from "@polymedia/coinmeta";
import { useFetch, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";
import { useAppContext } from "../App";
import { CardSpinner, CardWithMsg } from "./cards";
import { ConnectToGetStarted } from "./connect";

export type UseXDropResult = UseFetchResult<{
    xdrop: XDrop | null;
    coinMeta: CoinMetadata | null;
}>;

export type XDropLoaderProps = {
    fetched: UseXDropResult;
    requireWallet: boolean;
    children: (xdrop: XDrop, coinMeta: CoinMetadata) => React.ReactNode;
};

export function useXDrop(
    xdropId: string,
): UseXDropResult {
    const { xdropClient } = useAppContext();
    return useFetch(async () => {
        const xdrop = await xdropClient.fetchXDrop(xdropId);
        const coinMeta = !xdrop ? null
            : await getCoinMeta(xdropClient.suiClient, xdrop.type_coin);
        return { xdrop, coinMeta };
    }, [xdropClient, xdropId]);
}

export const XDropLoader: React.FC<XDropLoaderProps> = ({
    fetched,
    requireWallet,
    children
}) => {
    const currAcct = useCurrentAccount();

    if (fetched.err) {
        return <CardWithMsg className="compact">
            {fetched.err}
        </CardWithMsg>;
    }

    if (fetched.isLoading || fetched.data === undefined) {
        return <CardSpinner className="compact" />;
    }

    const { xdrop, coinMeta } = fetched.data;

    if (xdrop === null || coinMeta === null) {
        return <CardWithMsg className="compact">
            {xdrop === null ? "xDrop not found." : "Coin metadata not found."}
        </CardWithMsg>;
    }

    if (requireWallet && !currAcct) {
        return <div className="card compact center-text">
            <ConnectToGetStarted />
        </div>;
    }

    return <>{children(xdrop, coinMeta)}</>;
};
