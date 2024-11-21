import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { getAppConfig } from "./lib/config";

export const PageAddClaims: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { header, network, xdropClient, isWorking, setIsWorking } = useAppContext();
    const appCnf = getAppConfig(network);

    const disableSubmit = isWorking || !currAcct;

    const onSubmit = async () =>
    {
        if (!disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.adminAddsClaims(
                currAcct!.address,
                appCnf.coinType,
                appCnf.linkNetwork,
                appCnf.xdropId,
                appCnf.linkedAddrs,
                appCnf.claimAmounts,
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
