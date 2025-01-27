import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRef } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import { BtnPrevNext, isLocalhost, useFetch, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";

import { useFetchAndPaginate } from "@polymedia/suitcase-react";
import { useAppContext } from "./App";
import { BtnLinkInternal, BtnSubmit } from "./comp/buttons";
import { Card, CardMsg, CardSpinner, CardXDropDetails, XDropDetail, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { Loader, XDropLoader } from "./comp/loader";

export const PageClean = () =>
{
    const { xdropId } = useParams();
    const currAcct = useCurrentAccount();
    const { header, xdropClient } = useAppContext();

    const fetchedCap = useFetch(
        async () => !currAcct ? undefined : xdropClient.fetchOneCleanerCapId(currAcct.address),
        [xdropClient, currAcct],
    );

    return <>
        {header}
        <div id="page-clean" className="page-regular">
            { !xdropId
                ? <SubPageList />
                : <SubPageClean xdropId={xdropId} fetchedCap={fetchedCap} />
            }
        </div>
    </>;
};

const PAGE_SIZE = isLocalhost() ? 10 : 10;

const SubPageList = () => {
    const { xdropClient, isWorking } = useAppContext();
    const listRef = useRef<HTMLDivElement>(null);

    const xdrops = useFetchAndPaginate(
        async (cursor) => await xdropClient.fetchXDropsByEvent("EventEnd", {
            cursor: cursor as any, // eslint-disable-line
            limit: PAGE_SIZE,
        }),
        [xdropClient],
    );

    if (xdrops.err !== null) {
        return <CardMsg>{xdrops.err}</CardMsg>;
    }
    if (xdrops.page.length === 0) {
        return xdrops.isLoading
            ? <CardSpinner />
            : <CardMsg>No ended xDrops found</CardMsg>;
    }

    return <>
        <div className="page-content">
            <div className="page-title">
                Ended xDrops
            </div>

            <div ref={listRef} className={`card-list ${xdrops.isLoading ? "loading" : ""}`}>
                {xdrops.isLoading && <CardSpinner />}
                {xdrops.page.map(x =>
                    <CardXDropDetails xdrop={x} key={x.id}
                        button={<BtnLinkInternal to={`/clean/${x.id}`} disabled={isWorking}>
                            CLEAN
                        </BtnLinkInternal>}
                        extraDetails={<>
                            <XDropDetail label="Ended:" val={x.timestamp.toLocaleString()} />
                            <XDropDetail label="Claims:" val={x.claims.length} />
                        </>}
                    />
                )}
            </div>
            <BtnPrevNext data={xdrops} scrollToRefOnPageChange={listRef} />
        </div>
    </>;
};

const SubPageClean = ({
    xdropId,
    fetchedCap,
}: {
    xdropId: string;
    fetchedCap: UseFetchResult<string | null>;
}) =>
{
    const fetchedXDrop = useXDrop(xdropId);
    return (
        <div className="page-content">
            <div className="page-title">
                Clean xDrop
            </div>

            <XDropLoader fetched={fetchedXDrop} requireWallet={true}>
            {(xdrop, _coinMeta) => <>
                <CardXDropDetails
                    xdrop={xdrop}
                    extraDetails={<XDropStats xdrop={xdrop} coinMeta={_coinMeta} />}
                />

                <Loader name="Cleaner Cap" fetcher={fetchedCap}>
                {cleanerCapId =>
                    <CardClean
                        xdrop={xdrop}
                        cleanerCapId={cleanerCapId}
                        refetch={fetchedXDrop.refetch}
                    />
                }
                </Loader>
            </>}
            </XDropLoader>
        </div>
    );
};

const CardClean = ({
    xdrop, cleanerCapId, refetch,
}: {
    xdrop: XDrop;
    cleanerCapId: string;
    refetch: () => Promise<void>;
}) => {
    const { isWorking, setIsWorking, xdropClient } = useAppContext();

    const disableSubmit = isWorking || !xdrop.is_ended || xdrop.claims.length === 0;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }
        try {
            setIsWorking(true);

            console.debug("[onSubmit] fetching claim addrs");
            const foreignAddrs = await xdropClient.fetchAllClaimAddrs(xdrop.claims.id, true);

            console.debug("[onSubmit] submitting tx");
            const resp = await xdropClient.cleanerDeletesClaims({
                cleanerCapId,
                xdrop,
                addrs: foreignAddrs,
                onUpdate: msg => console.debug("[cleanerDeletesClaims]", msg),
            });

            console.debug("[onSubmit] okay:", resp);
            toast.success("Success");
            refetch();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to clean xDrop");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
        }
    };

    if (!xdrop.is_ended) {
        return <CardMsg>XDrop has not ended</CardMsg>;
    }
    if (xdrop.claims.length === 0) {
        return <CardMsg>Already clean</CardMsg>;
    }

    return <Card>
        <BtnSubmit disabled={disableSubmit} onClick={onSubmit}>CLEAN ALL</BtnSubmit>
    </Card>;
};
