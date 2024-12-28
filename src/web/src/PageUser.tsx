import { useCurrentAccount } from "@mysten/dapp-kit";
import { shortenAddress } from "@polymedia/suitcase-core";
import { useFetchAndPaginate } from "@polymedia/suitcase-react";
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "./App";
import { BtnPrevNext } from "./comp/BtnPrevNext";
import { CardSpinner, CardWithMsg } from "./comp/cards";
import { ConnectToGetStarted } from "./comp/connect";

export const PageUser: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { header, setIsWorking } = useAppContext();

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
        async (cursor) => await xdropClient.fetchEventShare(currAddr, PAGE_SIZE, cursor as any),
        [xdropClient, currAddr],
    );

    if (xdrops.err) {
        return <CardWithMsg>{xdrops.err}</CardWithMsg>;
    }
    if (xdrops.page.length === 0) {
        return xdrops.isLoading
            ? <CardSpinner />
            : <CardWithMsg>No auctions yet</CardWithMsg>;
    }

    return <>
        <div className="card-list" ref={listRef}>
            {xdrops.isLoading && <CardSpinner />}
            {xdrops.page.map(x =>
                <Link to={`/manage/${x.id}`} className="card tx" key={x.id}>
                    <div className="card-header column-on-small">
                    <div className="card-title">
                        {x.timestamp.toLocaleString()}
                    </div>
                    <div className="auction-header-info">
                        <span className="header-label">xdrop status</span>
                        </div>
                    </div>
                    <div className="card-body">
                        <div>{shortenAddress(x.id)}</div>
                        <div>{shortenAddress("0x" + x.type_coin)}</div>
                        <div>{shortenAddress("0x" + x.type_network)}</div>
                    </div>
                </Link>
            )}
        </div>
        <BtnPrevNext data={xdrops} scrollToRefOnPageChange={listRef} />
    </>;
};
