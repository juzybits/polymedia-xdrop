import { useCurrentAccount } from "@mysten/dapp-kit";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageManage: React.FC = () =>
{
    // === state ===

    const { xdropId } = useParams();
    if (xdropId !== "detf") { return <PageNotFound />; }

    const currAcct = useCurrentAccount();

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();
    const xCnf = appCnf[xdropId];

    const disableSubmit = isWorking || !currAcct;

    // === effects ===

    useEffect(() =>
    {
        xdropClient.fetchXDrop(xCnf.xdropId)
            .then(xdrop => {
                console.debug("[PageManage] xdrop:", JSON.stringify(xdrop, null, 2));
            });
    }, [xCnf.xdropId]);

    // === functions ===

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

    // === html ===

    return <>
    {header}
    <div id="page-manage" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Manage xDrop
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
