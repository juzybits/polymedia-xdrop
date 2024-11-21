import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { getWebConfig } from "./lib/config";
import { BtnConnect } from "./comps/connect";
import { Transaction } from "@mysten/sui/transactions";
import { getObjectIds } from "@polymedia/xdrop-sdk";

const linkedEthAddrs = [
    "eth address 1",
    "eth address 2",
];

export const PageDevLink: React.FC = () =>
{
    const currAcct = useCurrentAccount();

    const { header, network, xdropClient, isWorking, setIsWorking } = useAppContext();
    const cnf = getWebConfig(network);
    const objIds = getObjectIds(network);

    const disableSubmit = isWorking || !currAcct;

    const onSubmit = async () =>
    {
        if (!disableSubmit) { return; }

        try {
            setIsWorking(true);
            const tx = new Transaction();
            for (const ethAddr of linkedEthAddrs) {
                tx.moveCall({
                    package: objIds.suilinkPkgId,
                    module: "ethereum",
                    function: "dev_link",
                    arguments: [
                        tx.pure.address(currAcct!.address),
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
