import { useCurrentAccount } from "@mysten/dapp-kit";
import React, { useRef } from "react";

import { BtnPrevNext, useFetchAndPaginate } from "@polymedia/suitcase-react";

import { RPC_RESULTS_PER_PAGE, useAppContext } from "./App";
import { BtnLinkInternal } from "./comp/buttons";
import { Card, CardMsg, CardSpinner, CardXDropDetails, XDropDetail } from "./comp/cards";
import { ConnectToGetStarted } from "./comp/connect";
import { LoaderPaginated } from "./comp/loader";

export const PageUser = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { header } = useAppContext();

    return <>
        {header}
        <div id="page-user" className="page-regular">
            <div className="page-content">
                <div className="page-title">Your XDrops</div>
                {!currAcct
                    ? <Card><ConnectToGetStarted msg="Connect your Sui wallet to see your xDrops." /></Card>
                    : <ListCreatedXDrops currAddr={currAcct.address} />
                }
            </div>
        </div>
    </>;
};

const ListCreatedXDrops = ({ currAddr }: {
    currAddr: string;
}) =>
{
    const { xdropClient, isWorking } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const fetchXDrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsByEvent("EventShare", {
            sender: currAddr,
            cursor: cursor as any, // eslint-disable-line
            limit: RPC_RESULTS_PER_PAGE,
        }),
        [xdropClient, currAddr],
    );

    return <>
    <LoaderPaginated fetcher={fetchXDrops}>
    {(fetcher) => <>
        <div ref={listRef} className={`card-list ${fetcher.isLoading ? "loading" : ""}`}>
            {fetcher.isLoading && <CardSpinner />}
            {fetcher.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    button={
                        <BtnLinkInternal to={`/manage/${x.id}`} disabled={isWorking}>
                            MANAGE
                        </BtnLinkInternal>}
                    extraDetails={<XDropDetail label="Created:" val={x.timestamp.toLocaleString()} />}
                />
            )}
        </div>
        <BtnPrevNext data={fetchXDrops} scrollToRefOnPageChange={listRef} />
    </>}
    </LoaderPaginated>
    </>;
};
