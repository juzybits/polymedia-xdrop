import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useParams } from "react-router-dom";
import { PageNotFound } from "./PageNotFound";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";

export const PageNew: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { xdropId } = useParams();
    if (xdropId !== "detf") {
        return <PageNotFound />;
    }

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();
    const xCnf = appCnf[xdropId];

    const disableSubmit = isWorking || !currAcct;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.adminCreatesAndSharesXDrop(
                xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId
            );
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

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
