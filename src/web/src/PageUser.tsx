import { useCurrentAccount } from "@mysten/dapp-kit";
import React, { useRef } from "react";

import { BtnPrevNext, isLocalhost, useFetchAndPaginate } from "@polymedia/suitcase-react";

import { useAppContext } from "./App";
import { BtnLinkInternal } from "./comp/buttons";
import { Card, CardMsg, CardSpinner, CardXDropDetails, XDropDetail } from "./comp/cards";
import { ConnectToGetStarted } from "./comp/connect";

export const PageUser: React.FC = () =>
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

const PAGE_SIZE = isLocalhost() ? 10 : 10;

const ListCreatedXDrops = ({ currAddr }: {
    currAddr: string;
}) =>
{
    const { xdropClient, isWorking } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const xdrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsCreated(currAddr, cursor as any, PAGE_SIZE), // eslint-disable-line
        [xdropClient, currAddr],
    );

    if (xdrops.err !== null) {
        return <CardMsg>{xdrops.err}</CardMsg>;
    }
    if (xdrops.page.length === 0) {
        return xdrops.isLoading
            ? <CardSpinner />
            : <CardMsg>You haven't created any xDrops</CardMsg>;
    }

    return <>
        <div ref={listRef} className={`card-list ${xdrops.isLoading ? "loading" : ""}`}>
            {xdrops.isLoading && <CardSpinner />}
            {xdrops.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    button={<BtnLinkInternal to={`/manage/${x.id}`} disabled={isWorking}>
                        MANAGE
                    </BtnLinkInternal>}
                    extraDetails={<XDropDetail label="Created:" val={x.timestamp.toLocaleString()} />}
                />
            )}
        </div>
        <BtnPrevNext data={xdrops} scrollToRefOnPageChange={listRef} />
    </>;
};
