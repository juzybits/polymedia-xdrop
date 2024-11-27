import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageNew: React.FC = () =>
{
    // === state ===

    const { xdropId } = useParams();
    if (xdropId !== "detf") { return <PageNotFound />; }

    const currAcct = useCurrentAccount();

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();
    const xCnf = appCnf[xdropId];

    const disableSubmit = isWorking || !currAcct;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const { resp, xdropObjChange } = await xdropClient.adminCreatesAndSharesXDrop(
                xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId
            );
            console.debug("[onSubmit] resp:", resp);
            console.debug("[onSubmit] objChange:", xdropObjChange);
            console.debug("[onSubmit] obj ID:", xdropObjChange?.objectId);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    return <>
    {header}
    <div id="page-new" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Create xDrop
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-description">
                    <p>Coin Type: {xCnf.coinType}</p>
                    <p>Coin Decimals: {xCnf.coinDecimals}</p>
                    <p>Coin Ticker: {xCnf.coinTicker}</p>
                    <p>Link Network: {xCnf.linkNetwork}</p>
                </div>
                <div>
                    {currAcct
                        ? <Btn onClick={onSubmit}>Create</Btn>
                        : <BtnConnect />}
                </div>
            </div>

        </div>

    </div>
    </>;
};
