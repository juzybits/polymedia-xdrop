import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Btn } from "@polymedia/suitcase-react";
import { XDropIdentifier, XDropModule } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { useXDrop, XDropLoader } from "./comp/loader";
import { ResultMsg, SubmitRes } from "./comp/submits";
import { addressesToClean, cleanerCapId } from "./PageClean-dev-data";
import { PageNotFound } from "./PageNotFound";

export const PageClean: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);

    return <>
        {header}
        <div id="page-clean" className="page-regular">
            <div className="page-content">

                <div className="page-title">
                    Clean xDrop
                </div>

                <XDropLoader fetched={fetched} requireWallet={true}>
                {(xdrop, _coinMeta) =>
                {
                    return <CardClean
                        xdrop={xdrop}
                        cleanerCapId={cleanerCapId}
                        currAddr={currAcct!.address}
                        refetch={fetched.refetch}
                    />;
                }}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardClean: React.FC<{
    xdrop: XDropIdentifier;
    cleanerCapId: string;
    currAddr: string;
    refetch: () => Promise<void>;
}> = ({
    xdrop,
    cleanerCapId,
    currAddr,
    refetch,
}) =>
{
    const { isWorking, setIsWorking, xdropClient } = useAppContext();

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const disableSubmit = isWorking;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        const first100Addrs = addressesToClean.slice(0, 100); // TODO: support up to the limit per PTB in xdropClient

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });

            console.debug("[onSubmit] submitting tx");

            const tx = new Transaction();
            XDropModule.cleaner_deletes_claims(
                tx,
                xdropClient.xdropPkgId,
                xdrop.type_coin,
                xdrop.type_network,
                cleanerCapId,
                xdrop.id,
                first100Addrs,
            );
            const resp = await xdropClient.signAndExecuteTx(tx);

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
            <Btn disabled={disableSubmit} onClick={onSubmit}>CLEAN</Btn>
        </div>

        <ResultMsg res={submitRes} />

    </div>;
};
