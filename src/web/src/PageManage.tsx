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
            console.debug("[onOpen] okay:", resp);
        } catch (err) {
            console.warn("[onOpen] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    const onPause = async () =>
    {
        if (disableSubmit) { return; }
        try {
            setIsWorking(true);
            const resp = await xdropClient.adminPausesXDrop(
                xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId
            );
            console.debug("[onPause] okay:", resp);
        } catch (err) {
            console.warn("[onPause] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    const onEnd = async () =>
    {
        if (disableSubmit) { return; }
        try {
            setIsWorking(true);
            const resp = await xdropClient.adminEndsXDrop(
                xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId
            );
            console.debug("[onEnd] okay:", resp);
        } catch (err) {
            console.warn("[onEnd] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    const onReclaim = async () =>
    {
        if (disableSubmit) { return; }
        try {
            setIsWorking(true);
            const resp = await xdropClient.adminReclaimsBalance(
                xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId, currAcct.address
            );
            console.debug("[onReclaim] okay:", resp);
        } catch (err) {
            console.warn("[onReclaim] error:", err);
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
                <div className="card-title">
                    <p>Open xDrop</p>
                </div>
                <div className="card-description">
                    <p>Allow users to claim their share of the xDrop.</p>
                </div>
                <div className="card-description">
                    {currAcct
                    ? <Btn onClick={onOpen}>OPEN</Btn>
                    : <BtnConnect />}
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Close xDrop</p>
                </div>
                <div className="card-description">
                    <p>Stop users from claiming their share of the xDrop.</p>
                </div>
                <div className="card-description">
                    {currAcct
                    ? <Btn onClick={onPause}>PAUSE</Btn>
                    : <BtnConnect />}
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>End xDrop</p>
                </div>
                <div className="card-description">
                    <p>End the xDrop permanently. This cannot be undone.</p>
                </div>
                <div className="card-description">
                    {currAcct
                    ? <Btn onClick={onEnd}>END</Btn>
                    : <BtnConnect />}
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Reclaim Balance</p>
                </div>
                <div className="card-description">
                    <p>Reclaim the remaining balance of the xDrop.</p>
                </div>
                <div className="card-description">
                    {currAcct
                    ? <Btn onClick={onReclaim}>RECLAIM</Btn>
                    : <BtnConnect />}
                </div>
            </div>

            {/* admin_sets_admin_address TODO */}

        </div>

    </div>
    </>;
};
