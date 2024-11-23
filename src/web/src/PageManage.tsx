import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageManage: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { xdropId } = useParams();
    if (xdropId !== "detf") {
        return <PageNotFound />;
    }

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();
    const xCnf = appCnf[xdropId];

    const disableSubmit = isWorking || !currAcct;

    const onOpen = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.adminOpensXDrop(
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
    <div id="page-manage" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Create xDrop
            </div>

            <div className="card compact">
                <div>
                    {currAcct
                        ? <Btn onClick={onOpen}>Open</Btn>
                        : <BtnConnect />}
                </div>
            </div>

        </div>

    </div>
    </>;
};
