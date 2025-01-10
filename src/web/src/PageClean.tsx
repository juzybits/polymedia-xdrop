import { useCurrentAccount } from "@mysten/dapp-kit";
import { Btn, useFetch } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { CardMsg, CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { Loader, XDropLoader } from "./comp/loader";
import { ResultMsg, SubmitRes } from "./comp/submits";
import { PageNotFound } from "./PageNotFound";

export const PageClean: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetchedXDrop = useXDrop(xdropId);
    const fetchedCap = useFetch(
        async () => !currAcct ? undefined : xdropClient.fetchOneCleanerCapId(currAcct.address),
        [xdropClient, currAcct],
    );

    return <>
        {header}
        <div id="page-clean" className="page-regular">
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
                    />}
                    </Loader>

                </>}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardClean: React.FC<{
    xdrop: XDrop;
    cleanerCapId: string;
    refetch: () => Promise<void>;
}> = ({
    xdrop,
    cleanerCapId,
    refetch,
}) =>
{
    const { isWorking, setIsWorking, xdropClient } = useAppContext();

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const disableSubmit = isWorking || !xdrop.is_ended || xdrop.claims.size === 0;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });

            console.debug("[onSubmit] fetching claim addrs");
            const foreignAddrs = await xdropClient.fetchAllClaimAddrs(xdrop.claims.id, true);

            console.debug("[onSubmit] submitting tx");
            const resp = await xdropClient.cleanerDeletesClaims(
                cleanerCapId,
                xdrop,
                foreignAddrs,
            );

            console.debug("[onSubmit] okay:", resp);
            setSubmitRes({ ok: true });
            refetch();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            setSubmitRes({ ok: false, err: xdropClient.errParser.errToStr(err, "Failed to add claims") });
        } finally {
            setIsWorking(false);
        }
    };

    if (!xdrop.is_ended) {
        return <CardMsg>XDrop has not ended</CardMsg>;
    }
    if (xdrop.claims.size === 0) {
        return <CardMsg>Already clean</CardMsg>;
    }

    return <div className="card compact">

        {/* <div className="card-title"></div> */}

        <div className="card-description">
            <Btn disabled={disableSubmit} onClick={onSubmit}>CLEAN ALL</Btn>
        </div>

        <ResultMsg res={submitRes} />

    </div>;
};
