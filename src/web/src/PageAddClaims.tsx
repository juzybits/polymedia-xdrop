import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";
import { XDropConfig } from "./lib/app-config";

export const PageAddClaims: React.FC = () =>
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
            const resp = await xdropClient.adminAddsClaims(
                currAcct.address,
                xCnf.coinType,
                xCnf.linkNetwork,
                xCnf.xdropId,
                xCnf.linkedAddrs,
                xCnf.claimAmounts,
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
    <div id="page-add-claims" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Add Claims
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-description">
                    <p>Coin Type: {xCnf.coinType}</p>
                    <p>Link Network: {xCnf.linkNetwork}</p>
                    <p>xDrop ID: {xCnf.xdropId}</p>
                    <p>Linked Addresses: {xCnf.linkedAddrs.join(", ")}</p>
                    <p>Claim Amounts: {xCnf.claimAmounts.join(", ")}</p>
                </div>
                <div>
                    {currAcct
                        ? <Btn onClick={onSubmit}>ADD CLAIMS</Btn>
                        : <BtnConnect />}
                </div>
            </div>

        </div>

    </div>

    </>;
};
