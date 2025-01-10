import { useCurrentAccount } from "@mysten/dapp-kit";
import { Btn, useFetch, UseFetchResult } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { XDropLoader } from "./comp/loader";
import { ResultMsg, SubmitRes } from "./comp/submits";
import { claimsToClean, cleanerCapId } from "./PageClean-dev-data";
import { PageNotFound } from "./PageNotFound";

export const PageClean: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetchedXDropAndCoinMeta = useXDrop(xdropId);
    const fetchedCleanerCapId = useFetch(
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

                <XDropLoader fetched={fetchedXDropAndCoinMeta} requireWallet={true}>
                {(xdrop, _coinMeta) => <>
                    <CardXDropDetails xdrop={xdrop} extraDetails={<XDropStats xdrop={xdrop} coinMeta={_coinMeta} />} />
                    <CardClean
                        xdrop={xdrop}
                        fetchedCleanerCapId={fetchedCleanerCapId}
                        refetch={fetchedXDropAndCoinMeta.refetch}
                    />
                </>}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardClean: React.FC<{
    xdrop: XDrop;
    fetchedCleanerCapId: UseFetchResult<string | null>;
    refetch: () => Promise<void>;
}> = ({
    xdrop,
    fetchedCleanerCapId,
    refetch,
}) =>
{
    const { isWorking, setIsWorking, xdropClient } = useAppContext();

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const disableSubmit = isWorking || !!fetchedCleanerCapId.isLoading || !!fetchedCleanerCapId.err;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        const foreignAddrs = claimsToClean.map(claim => claim[0]); // TODO: fetch

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });

            console.debug("[onSubmit] submitting tx");
            const resp = await xdropClient.cleanerDeletesClaims(
                fetchedCleanerCapId.data!,
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

    return <div className="card compact">

        {/* <div className="card-title"></div> */}

        <div className="card-description">
            {JSON.stringify(fetchedCleanerCapId)}
        </div>

        <div className="card-description">
            <Btn disabled={disableSubmit} onClick={onSubmit}>CLEAN</Btn>
        </div>

        <ResultMsg res={submitRes} />

    </div>;
};
