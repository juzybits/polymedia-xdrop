import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";
import { Card, CardMsg, CardSpinner } from "./cards";
import { ConnectToGetStarted } from "./connect";
import { UseXDropResult } from "./hooks";

export const XDropLoader: React.FC<{
    fetched: UseXDropResult;
    requireWallet: boolean;
    children: (xdrop: XDrop, coinMeta: CoinMetadata) => React.ReactNode;
}> = ({
    fetched,
    requireWallet,
    children,
}) => {
    const currAcct = useCurrentAccount();

    if (fetched.err) {
        return <CardMsg>{fetched.err}</CardMsg>;
    }

    if (fetched.isLoading || fetched.data === undefined) {
        return <CardSpinner />;
    }

    const { xdrop, coinMeta } = fetched.data;

    if (xdrop === null || coinMeta === null) {
        return <CardMsg>
            {xdrop === null ? "xDrop not found." : "Coin metadata not found."}
        </CardMsg>;
    }

    if (requireWallet && !currAcct) {
        return <Card className="center-text">
            <ConnectToGetStarted />
        </Card>;
    }

    return <>{children(xdrop, coinMeta)}</>;
};

export const Loader = <T,>({
    name, fetcher, children
}: {
    name: string;
    fetcher: UseFetchResult<T>;
    children: (data: NonNullable<T>) => React.ReactNode;
}) => {
    if (fetcher.err)
        return <CardMsg>{fetcher.err}</CardMsg>;
    if (fetcher.isLoading || fetcher.data === undefined)
        return <CardSpinner />;
    if (fetcher.data === null)
        return <CardMsg>{name} not found</CardMsg>;
    return <>{children(fetcher.data)}</>;
};
