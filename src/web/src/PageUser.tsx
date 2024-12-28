import { useCurrentAccount } from "@mysten/dapp-kit";
import { BtnPrevNext, useFetchAndPaginate } from "@polymedia/suitcase-react";
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "./App";
import { CardSpinner, CardWithMsg, CardXDropDetails, XDropDetail } from "./comp/cards";
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
                    ? <div className="card compact center-text"><ConnectToGetStarted /></div>
                    : <ListXdrops currAddr={currAcct.address} />
                }
            </div>
        </div>
    </>;
};

const PAGE_SIZE = 2;

const ListXdrops: React.FC<{
    currAddr: string;
}> = ({
    currAddr,
}) =>
{
    const { xdropClient } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const xdrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsCreated(currAddr, PAGE_SIZE, cursor as any),
        [xdropClient, currAddr],
    );

    if (xdrops.err) {
        return <CardWithMsg>{xdrops.err}</CardWithMsg>;
    }
    if (xdrops.page.length === 0) {
        return xdrops.isLoading
            ? <CardSpinner className="compact" />
            : <CardWithMsg>No auctions yet</CardWithMsg>;
    }

    return <>
        <div ref={listRef} className={`card-list ${xdrops.isLoading ? "loading" : ""}`}>
            {xdrops.isLoading && <CardSpinner className="compact" />}
            {xdrops.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    button={<Link to={`/manage/${x.id}`} className="btn">MANAGE</Link>}
                    extraDetails={<XDropDetail label="Created:" val={x.timestamp.toLocaleString()} />}
                />
            )}
        </div>
        <BtnPrevNext data={xdrops} scrollToRefOnPageChange={listRef} />
    </>;
};
