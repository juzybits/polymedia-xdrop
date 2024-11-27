import { useCurrentAccount } from "@mysten/dapp-kit";
import { getLinkType } from "@polymedia/xdrop-sdk";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageAddClaims: React.FC = () =>
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
            const resp = await xdropClient.adminAddsClaims(
                currAcct.address,
                xCnf.coinType,
                xCnf.linkNetwork,
                xCnf.xdropId,
                xCnf.devLinkedAddrs,
                xCnf.devClaimAmounts,
            );
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

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
                    <p>Coin Type:<br/>{xCnf.coinType}</p>
                    <p>Network Type:<br/>{ getLinkType(xdropClient.suilinkPkgId, xCnf.linkNetwork, "inner") }</p>
                    <p>xDrop ID:<br/>{xCnf.xdropId}</p>
                    <p>Linked Addresses:<br/>{xCnf.devLinkedAddrs.join(", ")}</p>
                    <p>Claim Amounts:<br/>{xCnf.devClaimAmounts.join(", ")}</p>
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
