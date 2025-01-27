import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRef } from "react";
import toast from "react-hot-toast";

import { BtnPrevNext, isLocalhost, useFetch, useFetchAndPaginate } from "@polymedia/suitcase-react";
import { MAX_OBJECTS_PER_TX, XDrop } from "@polymedia/xdrop-sdk";

import { useAppContext } from "./App";
import { BtnSubmit } from "./comp/buttons";
import { CardMsg, CardSpinner, CardXDropDetails, XDropDetail } from "./comp/cards";

export const PageClean = () =>
{
    const currAcct = useCurrentAccount();
    const { header } = useAppContext();

    return <>
        {header}
        <div id="page-clean" className="page-regular">
            <div className="page-content">
                <div className="page-title">Ended xDrops</div>
                {!currAcct
                    ? <CardMsg>Connect your wallet to clean xDrops</CardMsg>
                    : <ListEndedXDrops currAddr={currAcct.address} />
                }
            </div>
        </div>
    </>;
};

const PAGE_SIZE = isLocalhost() ? 10 : 10;

const ListEndedXDrops = ({
    currAddr,
}: {
    currAddr: string;
}) =>
{
    const { xdropClient, isWorking, setIsWorking } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const fetchedCap = useFetch(
        async () => xdropClient.fetchOneCleanerCapId(currAddr),
        [xdropClient, currAddr],
    );
    const cleanerCapId = fetchedCap.data;

    const fetchedXdrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsByEvent('EventEnd', {
            cursor: cursor as any, // eslint-disable-line
            limit: PAGE_SIZE,
        }),
        [xdropClient],
    );

    const onClean = async (xdrop: XDrop) =>
    {
        if (!cleanerCapId || xdrop.claims.length === 0) return;

        try {
            setIsWorking(true);
            let cleanedCount = 0;
            let hasMore = true;
            const totalClaims = xdrop.claims.length;
            const totalBatches = Math.ceil(totalClaims / MAX_OBJECTS_PER_TX);
            let batchCount = 0;

            console.debug(`[onClean] starting cleanup of ${totalClaims} claims`);
            while (hasMore)
            {
                console.debug(`[onClean] fetching batch ${batchCount+1}/${totalBatches}`);
                const result = await xdropClient.fetchClaimAddrs(xdrop.claims.id, MAX_OBJECTS_PER_TX);

                if (result.addrs.length === 0) {
                    console.debug("[onClean] no more claims found in this batch");
                    break;
                }

                console.debug(`[onClean] cleaning ${result.addrs.length} claims`);
                await xdropClient.cleanerDeletesClaims({
                    cleanerCapId,
                    xdrop,
                    addrs: result.addrs,
                    onUpdate: msg => console.debug("[cleanerDeletesClaims]", msg),
                });

                cleanedCount += result.addrs.length;
                console.debug(`[onClean] cleaned: ${cleanedCount}/${totalClaims}`);

                hasMore = result.hasNextPage;
                batchCount++;
            }

            const remaining = totalClaims - cleanedCount;
            if (remaining > 0) {
                console.warn(`[onClean] cleaned ${cleanedCount} claims but expected ${totalClaims} (${remaining} remaining)`);
            } else {
                console.debug(`[onClean] successfully cleaned all ${cleanedCount} claims`);
            }
            // fetchedXdrops.refetch();
        } catch (err) {
            console.warn("[onClean] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to clean xDrop");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
        }
    };

    if (fetchedCap.err !== null || fetchedXdrops.err !== null) {
        return <CardMsg>{fetchedCap.err || fetchedXdrops.err}</CardMsg>;
    }
    if (fetchedCap.isLoading || fetchedXdrops.isLoading) {
        return <CardSpinner />;
    }
    if (fetchedXdrops.page.length === 0) {
        return <CardMsg>No ended xDrops found</CardMsg>;
    }

    return <>
        <div ref={listRef} className={`card-list ${fetchedXdrops.isLoading ? "loading" : ""}`}>
            {fetchedXdrops.isLoading && <CardSpinner />}
            {fetchedXdrops.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    button={
                        <BtnSubmit
                            disabled={isWorking || !cleanerCapId || x.claims.length === 0}
                            onClick={() => onClean(x)}
                        >
                            {x.claims.length === 0 ? "CLEAN" : `CLEAN (${x.claims.length})`}
                        </BtnSubmit>
                    }
                    extraDetails={<>
                        <XDropDetail label="Ended:" val={x.timestamp.toLocaleString()} />
                        <XDropDetail label="Claims:" val={x.claims.length} />
                    </>}
                />
            )}
        </div>
        <BtnPrevNext data={fetchedXdrops} scrollToRefOnPageChange={listRef} />
    </>;
};
