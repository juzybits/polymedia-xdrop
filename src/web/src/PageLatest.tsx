import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRef } from "react";

import { BtnPrevNext, isLocalhost, useFetchAndPaginate } from "@polymedia/suitcase-react";

import { useAppContext } from "./App";
import { CardSpinner, CardXDropDetails, XDropDetail, XDropDetailAddrs } from "./comp/cards";
import { LoaderPaginated } from "./comp/loader";

export const PageLatest = () =>
{
    const { header } = useAppContext();

    return <>
        {header}
        <div id="page-latest" className="page-regular">
            <div className="page-content">
                <div className="page-title">Latest xDrops</div>
                <ListLatestXDrops />
            </div>
        </div>
    </>;
};

const PAGE_SIZE = isLocalhost() ? 10 : 10;

const ListLatestXDrops = () =>
{
    const currAcct = useCurrentAccount();
    const { network, xdropClient, isWorking, setIsWorking } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const fetchXDrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsByEvent("EventShare", {
            cursor: cursor as any, // eslint-disable-line
            limit: PAGE_SIZE,
        }),
        [xdropClient],
    );

    return <>
        <LoaderPaginated fetcher={fetchXDrops}>
        {(fetcher => <>
            <div ref={listRef} className={`card-list ${fetchXDrops.isLoading ? "loading" : ""}`}>
                {fetchXDrops.isLoading && <CardSpinner />}
                {fetchXDrops.page.map(x =>
                    <CardXDropDetails xdrop={x} key={x.id}
                        extraDetails={<>
                            <XDropDetailAddrs xdrop={x} />
                            <XDropDetail label="Created:" val={x.timestamp.toLocaleString()} />
                        </>}
                    />
                )}
            </div>
            <BtnPrevNext data={fetchXDrops} scrollToRefOnPageChange={listRef} />
        </>)}
        </LoaderPaginated>
    </>;
};
