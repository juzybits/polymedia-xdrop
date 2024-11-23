import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";

export const PageManage: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();

    const disableSubmit = isWorking || !currAcct;

    const onOpen = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.adminOpensXDrop(
                appCnf.coinType, appCnf.linkNetwork, appCnf.xdropId
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
