import { useCurrentAccount } from "@mysten/dapp-kit";
import { useFetchAndPaginate } from "@polymedia/suitcase-react";
import React from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "./App";
import { ConnectOr, ConnectToGetStarted } from "./comp/connect";
import { CardSpinner } from "./comp/cards";
import { CardWithMsg } from "./comp/cards";
import { shortenAddress } from "@polymedia/suitcase-core";
import { XDropIdentifier } from "@polymedia/xdrop-sdk";
import { BtnPrevNext } from "./comp/BtnPrevNext";

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

const ListXdrops: React.FC<{
    currAddr: string;
}> = ({
    currAddr,
}) =>
{
    const PAGE_SIZE = 2;
    const { xdropClient } = useAppContext();

    const xdrops = useFetchAndPaginate<XDropIdentifier & {timestamp: Date}, string | null>(
        async (cursor) => {
            const xdrops = await xdropClient.fetchEventsShare(currAddr, PAGE_SIZE, cursor);
            return {
                data: xdrops.items,
                hasNextPage: xdrops.pageInfo.hasPreviousPage,
                nextCursor: xdrops.pageInfo.startCursor,
            };
        },
        [xdropClient, currAddr],
    );

    if (xdrops.err) {
        return <CardWithMsg>{xdrops.err}</CardWithMsg>;
    }
    if (xdrops.isLoading && xdrops.page.length === 0) {
        return <CardSpinner />;
    }
    if (!xdrops.isLoading && xdrops.page.length === 0) {
        return <CardWithMsg>No auctions yet</CardWithMsg>;
    }

    return <>
        <div className="card-list">
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
        <BtnPrevNext data={xdrops} />
    </>;
};
