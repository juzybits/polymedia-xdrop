import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { getNetworkConfig } from "@polymedia/xdrop-sdk";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { useParams } from "react-router-dom";
import { PageNotFound } from "./PageNotFound";

export const PageDevLink: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { xdropId } = useParams();
    if (xdropId !== "detf") {
        return <PageNotFound />;
    }

    const { header, appCnf, network, xdropClient, isWorking, setIsWorking } = useAppContext();
    const netCnf = getNetworkConfig(network);
    const xCnf = appCnf[xdropId];
    const disableSubmit = isWorking || !currAcct;

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const tx = new Transaction();
            for (const ethAddr of xCnf.linkedAddrs) {
                tx.moveCall({
                    package: netCnf.suilinkPkgId,
                    module: xCnf.linkNetwork,
                    function: "dev_link",
                    arguments: [
                        tx.pure.address(currAcct.address),
                        tx.pure.string(ethAddr),
                    ],
                });
            }
            const resp = await xdropClient.signAndExecuteTransaction(tx);
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    return <>
    {header}
    <div id="page-dev-link" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Dev Link
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-description">
                    <p>Link Network: {xCnf.linkNetwork}</p>
                    <p>Linked Addresses: {xCnf.linkedAddrs.join(", ")}</p>
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
