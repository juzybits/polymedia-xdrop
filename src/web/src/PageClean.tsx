import { useCurrentAccount } from "@mysten/dapp-kit";
import { Btn, useFetch } from "@polymedia/suitcase-react";
import { XDrop } from "@polymedia/xdrop-sdk";
import React from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Card, CardMsg, CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { Loader, XDropLoader } from "./comp/loader";
import { clientWithKeypair } from "./lib/helpers";
import { PageNotFound } from "./PageNotFound";
import { BtnSubmit } from "./comp/buttons";

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

    const disableSubmit = isWorking || !xdrop.is_ended || xdrop.claims.size === 0;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);

            console.debug("[onSubmit] fetching claim addrs");
            const foreignAddrs = await xdropClient.fetchAllClaimAddrs(xdrop.claims.id, true);

            console.debug("[onSubmit] submitting tx");
            const client = clientWithKeypair(xdropClient);
            const resp = await client.cleanerDeletesClaims(
                cleanerCapId,
                xdrop,
                foreignAddrs,
            );

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
    if (xdrop.claims.size === 0) {
        return <CardMsg>Already clean</CardMsg>;
    }

    return <Card>
        <BtnSubmit disabled={disableSubmit} onClick={onSubmit}>CLEAN ALL</BtnSubmit>
    </Card>;
};
