import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { useFetch } from "@polymedia/suitcase-react";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { CardSpinner, CardWithMsg } from "./comps/cards";
import { ConnectToGetStarted } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageManage: React.FC = () =>
{
    // === state ===

    const { xdropId } = useParams();
    if (xdropId !== "detf") { return <PageNotFound />; }

    const currAcct = useCurrentAccount();

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();
    const xCnf = appCnf[xdropId];

    const fetched = useFetch(
        async () => !currAcct ? undefined : await xdropClient.fetchXDrop(xCnf.xdropId),
        [xCnf.xdropId, currAcct?.address]
    );
    const { error, isLoading, refetch, data: xdrop } = fetched;

    // === html ===

    const AdminAction: React.FC<{
        title: string;
        info: string;
        btnTxt: string;
        submit: () => Promise<void>;
    }> = (p) =>
    {
        return (
            <div className="card compact">
                <div className="card-title">
                    <p>{p.title}</p>
                </div>
                <div className="card-description">
                    <p>{p.info}</p>
                </div>
                <div className="card-description">
                    <Btn onClick={p.submit} disabled={isWorking} className={p.btnTxt === "END" ? "red" : ""}>
                        {p.btnTxt}
                    </Btn>
                </div>
            </div>
        );
    };

    const body: React.ReactNode = (() =>
    {
        if (error) {
            return <CardWithMsg className="compact">
                {error}
            </CardWithMsg>;
        }
        if (!currAcct) {
            return <div className="card compact center-text">
                <ConnectToGetStarted />
            </div>;
        }
        if (isLoading || !xdrop) {
            return <CardSpinner className="compact" />;
        }

        const adminActions = [
            {
                title: "Open xDrop",
                info: "Allow users to claim their share of the xDrop.",
                btnTxt: "OPEN",
                submit: () => xdropClient.adminOpensXDrop(
                    xCnf.coinType,
                    xCnf.linkNetwork,
                    xCnf.xdropId
                ),
                showIf: !xdrop.is_ended && xdrop.is_paused,
            },
            {
                title: "Pause xDrop",
                info: "Stop users from claiming their share of the xDrop.",
                btnTxt: "PAUSE",
                submit: () => xdropClient.adminPausesXDrop(
                    xCnf.coinType,
                    xCnf.linkNetwork,
                    xCnf.xdropId
                ),
                showIf: !xdrop.is_ended && xdrop.is_open,
            },
            {
                title: "End xDrop",
                info: "End the xDrop permanently. This cannot be undone.",
                btnTxt: "END",
                submit: () => xdropClient.adminEndsXDrop(
                    xCnf.coinType,
                    xCnf.linkNetwork,
                    xCnf.xdropId
                ),
                showIf: !xdrop.is_ended,
            },
            {
                title: "Reclaim Balance",
                info: "Reclaim the remaining balance of the xDrop.",
                btnTxt: "RECLAIM",
                submit: () => xdropClient.adminReclaimsBalance(
                    xCnf.coinType,
                    xCnf.linkNetwork,
                    xCnf.xdropId,
                    currAcct.address
                ),
                showIf: xdrop.is_ended,
            },
        ].filter(action => action.showIf);

        const onSubmit = async (fn: () => Promise<SuiTransactionBlockResponse>) =>
        {
            if (isWorking || !currAcct) return;
            try {
                setIsWorking(true);
                const resp = await fn();
                console.debug("[onSubmit] okay:", resp);
            } catch (err) {
                console.warn("[onSubmit] error:", err);
            } finally {
                setIsWorking(false);
                refetch();
            }
        };

        return <>
            {adminActions.map((action, idx) => (
                <AdminAction
                    key={idx}
                    {...action}
                    submit={() => onSubmit(action.submit)}
                />
            ))}
        </>;
    })();

    return <>
    {header}
    <div id="page-manage" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Manage xDrop
            </div>

            {body}

        </div>

    </div>
    </>;
};
