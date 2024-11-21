import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { getAppConfig } from "./lib/config";
import { BtnConnect } from "./comps/connect";

export const PageNew: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { header, network } = useAppContext();
    const appCnf = getAppConfig(network);

    const onCreate = () => {
        if (!currAcct) { return; }
        console.log("onCreate");
    };

    return <>
    {header}
    <div id="page-new" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Create XDrop
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-description">
                    <p>XDrop ID: {appCnf.xdropId}</p>
                    <p>Coin Type: {appCnf.coinType}</p>
                    <p>Coin Decimals: {appCnf.coinDecimals}</p>
                    <p>Coin Ticker: {appCnf.coinTicker}</p>
                    <p>Link Network: {appCnf.linkNetwork}</p>
                </div>
                <div>
                    {currAcct
                        ? <Btn onClick={onCreate}>Create</Btn>
                        : <BtnConnect />}
                </div>
            </div>

        </div>

    </div>
    </>;
};
