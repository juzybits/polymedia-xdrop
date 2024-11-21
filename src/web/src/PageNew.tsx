import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { getWebConfig } from "./lib/config";
import { BtnConnect } from "./comps/connect";

export const PageNew: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { header, network } = useAppContext();
    const cnf = getWebConfig(network);

    const onCreate = () => {
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
                    <p>XDrop ID: {cnf.xdropId}</p>
                    <p>Coin Type: {cnf.coinType}</p>
                    <p>Coin Decimals: {cnf.coinDecimals}</p>
                    <p>Coin Ticker: {cnf.coinTicker}</p>
                    <p>Link Network: {cnf.linkNetwork}</p>
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
