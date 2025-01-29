import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";

import { UseFetchAndPaginateResult, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";

import { Card, CardMsg, CardSpinner } from "./cards";
import { ConnectToGetStarted } from "./connect";
import { UseXDropResult } from "./hooks";

export const XDropLoader = ({
    fetch,
    requireWallet,
    children,
}: {
    fetch: UseXDropResult;
    requireWallet: boolean;
    children: (xdrop: XDrop, coinMeta: CoinMetadata) => React.ReactNode;
}) => {
    const currAcct = useCurrentAccount();

    if (fetch.err !== null) {
        return <CardMsg>{fetch.err}</CardMsg>;
    }

    if (fetch.isLoading || fetch.data === undefined) {
        return <CardSpinner />;
    }

    const { xdrop, coinMeta } = fetch.data;

    if (xdrop === null || coinMeta === null) {
        return <CardMsg>
            {xdrop === null ? "xDrop not found." : "Coin metadata not found."}
        </CardMsg>;
    }

    if (requireWallet && !currAcct) {
        return <Card>
            <ConnectToGetStarted msg="Connect your Sui wallet to get started." />
        </Card>;
    }

    return <>{children(xdrop, coinMeta)}</>;
};

export const Loader = <T,>({
    name,
    fetcher,
    children
}: {
    name: string;
    fetcher: UseFetchResult<T>;
    children: (data: NonNullable<T>) => React.ReactNode;
}) => {
    if (fetcher.err !== null)
        return <CardMsg>{fetcher.err}</CardMsg>;
    if (fetcher.isLoading || fetcher.data === undefined)
        return <CardSpinner />;
    if (fetcher.data === null)
        return <CardMsg>{name} not found</CardMsg>;
    return <>{children(fetcher.data)}</>;
};

export const LoaderPaginated = <T, C>({
    fetcher, children
}: {
    fetcher: UseFetchAndPaginateResult<T, C>;
    children: (fetcher: UseFetchAndPaginateResult<T, C>) => React.ReactNode;
}) => {
    if (fetcher.err !== null)
        return <CardMsg>{fetcher.err}</CardMsg>;
    if (fetcher.isLoading || fetcher.page.length === 0)
        return <CardSpinner />;

    return <>{children(fetcher)}</>;
};
