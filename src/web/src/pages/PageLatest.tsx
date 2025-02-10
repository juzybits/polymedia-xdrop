import { useRef } from "react";

import { BtnPrevNext, useFetchAndPaginate, CardSpinner, CardDetail, LoaderPaginated } from "@polymedia/suitcase-react";

import { RPC_RESULTS_PER_PAGE } from "../app/config";
import { useAppContext } from "../app/context";
import { CardXDropDetails, XDropDetailAddrs } from "../comp/cards";

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
    <LoaderPaginated fetch={fetchXDrops}>
    {(fetch) => <>
        <div ref={listRef} className={`card-list ${fetch.isLoading ? "loading" : ""}`}>
            {fetch.isLoading && <CardSpinner />}
            {fetch.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    extraDetails={<>
                        <XDropDetailAddrs xdrop={x} />
                        <CardDetail label="Created:" val={x.timestamp.toLocaleString()} />
                    </>}
                />
            )}
        </div>
        <BtnPrevNext data={fetchXDrops} scrollToRefOnPageChange={listRef} />
    </>}
    </LoaderPaginated>
    </>;
};
