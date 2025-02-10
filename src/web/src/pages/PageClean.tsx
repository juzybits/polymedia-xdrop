import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRef } from "react";
import toast from "react-hot-toast";

import { BtnPrevNext, BtnSubmit, useFetch, useFetchAndPaginate, Card, CardMsg, CardSpinner } from "@polymedia/suitcase-react";
import { CLEANER_ADDR, MAX_OBJECTS_PER_TX, XDrop } from "@polymedia/xdrop-sdk";

import { RPC_RESULTS_PER_PAGE } from "../app/config";
import { useAppContext } from "../app/context";
import { CardXDropDetails, XDropDetail } from "../comp/cards";
import { BtnConnect } from "../comp/connect";
import { useAdminPrivateKey } from "../lib/hooks";
import { clientWithKeypair } from "../lib/utils";

export const PageClean = () =>
{
    const { header } = useAppContext();

    return <>
        {header}
        <div id="page-clean" className="page-regular">
            <div className="page-content">
                <div className="page-title">Ended xDrops</div>
                <ListEndedXDrops />
            </div>
        </div>
    </>;
};

const ListEndedXDrops = () =>
{
    const currAcct = useCurrentAccount();
    const { network, xdropClient, isWorking, setIsWorking } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const privateKey = useAdminPrivateKey({
        expectedAddr: CLEANER_ADDR[network],
        label: "Cleaner private key:",
        errorMsg: "Cleaner private key does not match XDrop cleaner.",
    });
    const cleanerAddr = privateKey.val?.toSuiAddress() ?? currAcct?.address ?? null;

    const fetchCap = useFetch(
        async () => {
            if (!cleanerAddr) return null;
            console.debug("[fetchOneCleanerCapId] fetching cleaner cap id for", cleanerAddr);
            const resp = await xdropClient.fetchOneCleanerCapId(cleanerAddr);
            console.debug("[fetchOneCleanerCapId] fetched cleaner cap id:", resp);
            return resp;
        },
        [xdropClient, cleanerAddr],
    );
    const cleanerCapId = fetchCap.data;

    const fetchXDrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsByEvent("EventEnd", {
            cursor: cursor as any, // eslint-disable-line
            limit: RPC_RESULTS_PER_PAGE,
        }),
        [xdropClient],
    );

    const disableSubmit = isWorking || !cleanerCapId || privateKey.err !== null;

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

            const client = !privateKey.val ? xdropClient : clientWithKeypair(xdropClient, privateKey.val);

            console.debug(`[onClean] will clean ${totalClaims} claims in ${totalBatches} batches`);
            while (hasMore)
            {
                console.debug(`[onClean] fetching batch ${batchCount+1}/${totalBatches}`);
                const result = await xdropClient.fetchClaimAddrs(xdrop.claims.id, MAX_OBJECTS_PER_TX);

                if (result.addrs.length === 0) {
                    console.debug("[onClean] no more claims found in this batch");
                    break;
                }

                console.debug(`[onClean] cleaning ${result.addrs.length} claims`);
                await client.cleanerDeletesClaims({
                    cleanerCapId,
                    xdrop,
                    addrs: result.addrs,
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
            // fetchXDrops.refetch();
        } catch (err) {
            console.warn("[onClean] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to clean xDrop");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
        }
    };

    if (fetchCap.err !== null || fetchXDrops.err !== null) {
        return <CardMsg>{fetchCap.err || fetchXDrops.err}</CardMsg>;
    }
    if (fetchCap.isLoading || fetchXDrops.isLoading) {
        return <CardSpinner />;
    }
    if (fetchXDrops.page.length === 0) {
        return <CardMsg>No ended xDrops found</CardMsg>;
    }

    return <>
        <Card>
            <div className="card-desc">
                {!currAcct && <BtnConnect />}
                <form onSubmit={e => e.preventDefault()}>
                    <div>{privateKey.input}</div>
                </form>
            </div>
        </Card>
        <div ref={listRef} className={`card-list ${fetchXDrops.isLoading ? "loading" : ""}`}>
            {fetchXDrops.isLoading && <CardSpinner />}
            {fetchXDrops.page.map(x =>
                <CardXDropDetails xdrop={x} key={x.id}
                    button={
                        <BtnSubmit
                            disabled={disableSubmit || x.claims.length === 0}
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
        <BtnPrevNext data={fetchXDrops} scrollToRefOnPageChange={listRef} />
    </>;
};
