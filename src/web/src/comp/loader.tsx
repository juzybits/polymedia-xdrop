import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import React from "react";

import { Card, CardMsg, CardSpinner } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";

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
