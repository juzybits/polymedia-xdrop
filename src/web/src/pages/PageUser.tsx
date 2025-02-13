import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRef } from "react";

import { BtnLinkInternal, BtnPrevNext, useFetchAndPaginate, Card, CardSpinner, CardDetail, LoaderPaginated } from "@polymedia/suitcase-react";

import { RPC_RESULTS_PER_PAGE } from "../app/config";
import { useAppContext } from "../app/context";
import { CardXDropDetails } from "../comp/cards";
import { ConnectToGetStarted } from "../comp/connect";

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
    <LoaderPaginated fetch={fetchXDrops}>
    {(fetch) => <>
        <div ref={listRef} className={`card-list ${fetch.isLoading ? "loading" : ""}`}>
            {fetch.isLoading && <CardSpinner />}
            {fetch.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    button={
                        <BtnLinkInternal to={`/manage/${x.id}`} disabled={isWorking}>
                            MANAGE
                        </BtnLinkInternal>}
                    extraDetails={<CardDetail label="Created:" val={x.timestamp.toLocaleString()} />}
                />
            )}
        </div>
        <BtnPrevNext data={fetchXDrops} scrollToRefOnPageChange={listRef} />
    </>}
    </LoaderPaginated>
    </>;
};
