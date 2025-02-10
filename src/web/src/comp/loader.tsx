import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import React from "react";

import { UseFetchAndPaginateResult, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";

import { Card, CardMsg, CardSpinner } from "./cards";
import { ConnectToGetStarted } from "./connect";
import { UseXDropResult } from "../lib/hooks";

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
    fetch,
    children
}: {
    name: string;
    fetch: UseFetchResult<T>;
    children: (data: NonNullable<T>) => React.ReactNode;
}) => {
    if (fetch.err !== null)
        return <CardMsg>{fetch.err}</CardMsg>;
    if (fetch.isLoading || fetch.data === undefined)
        return <CardSpinner />;
    if (fetch.data === null)
        return <CardMsg>{name} not found</CardMsg>;
    return <>{children(fetch.data)}</>;
};

export const LoaderPaginated = <T, C>({
    fetch, children, msgErr, msgEmpty,
}: {
    fetch: UseFetchAndPaginateResult<T, C>;
    children: (fetch: UseFetchAndPaginateResult<T, C>) => React.ReactNode;
    msgErr?: React.ReactNode;
    msgEmpty?: React.ReactNode;
}) => {
    if (fetch.err !== null)
        return <CardMsg>{msgErr ?? fetch.err}</CardMsg>;

    if (fetch.page.length === 0) {
        return fetch.isLoading
            ? <CardSpinner />
            : <CardMsg>{msgEmpty ?? "None found"}</CardMsg>;
    }

    return <>{children(fetch)}</>;
};
