import { useRef } from "react";

import { BtnPrevNext, useFetchAndPaginate } from "@polymedia/suitcase-react";

import { RPC_RESULTS_PER_PAGE, useAppContext } from "./App";
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

const ListLatestXDrops = () =>
{
    const { xdropClient } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const fetchXDrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsByEvent("EventShare", {
            cursor: cursor as any, // eslint-disable-line
            limit: RPC_RESULTS_PER_PAGE,
        }),
        [xdropClient],
    );

    return <>
    <LoaderPaginated fetcher={fetchXDrops}>
        {(fetcher) => <>
            <div ref={listRef} className={`card-list ${fetcher.isLoading ? "loading" : ""}`}>
                {fetcher.isLoading && <CardSpinner />}
                {fetcher.page.map(x =>
                    <CardXDropDetails xdrop={x} key={x.id}
                        extraDetails={<>
                            <XDropDetailAddrs xdrop={x} />
                            <XDropDetail label="Created:" val={x.timestamp.toLocaleString()} />
                        </>}
                    />
                )}
            </div>
            <BtnPrevNext data={fetchXDrops} scrollToRefOnPageChange={listRef} />
        </>}
    </LoaderPaginated>
    </>;
};
