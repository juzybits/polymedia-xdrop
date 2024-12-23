import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { TransferModule } from "@polymedia/suitcase-core";
import { useFetch } from "@polymedia/suitcase-react";
import { XDropModule } from "@polymedia/xdrop-sdk";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { CardSpinner, CardWithMsg } from "./comps/cards";
import { ConnectToGetStarted } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageManage: React.FC = () =>
{
    // === state ===

    let { xdropId } = useParams();
    if (!xdropId) { return <PageNotFound />; }

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();

    if (xdropId === "detf") {
        xdropId = appCnf["detf"].xdropId;
    }

    const currAcct = useCurrentAccount();

    const fetched = useFetch(
        async () => !currAcct ? undefined : await xdropClient.fetchXDrop(xdropId),
        [xdropId, currAcct?.address]
    );
    const { error, isLoading, refetch, data: xdrop } = fetched;

    // === effects ===

    useEffect(() => {
        console.debug("[PageManage] xdrop:", JSON.stringify(xdrop, null, 2));
    }, [xdrop]);

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
        if (isLoading || xdrop === undefined) {
            return <CardSpinner className="compact" />;
        }
        if (xdrop === null) {
            return <CardWithMsg className="compact">
                xDrop not found.
            </CardWithMsg>;
        }

        const adminActions = [
            {
                title: "Open xDrop",
                info: "Allow users to claim their share of the xDrop.",
                btnTxt: "OPEN",
                submit: (tx: Transaction) => XDropModule.admin_opens_xdrop(
                    tx,
                    xdropClient.xdropPkgId,
                    xdrop.type_coin,
                    xdrop.type_network,
                    xdropId,
                ),
                showIf: !xdrop.is_ended && xdrop.is_paused,
            },
            {
                title: "Pause xDrop",
                info: "Stop users from claiming their share of the xDrop.",
                btnTxt: "PAUSE",
                submit: (tx: Transaction) => XDropModule.admin_pauses_xdrop(
                    tx,
                    xdropClient.xdropPkgId,
                    xdrop.type_coin,
                    xdrop.type_network,
                    xdropId,
                ),
                showIf: !xdrop.is_ended && xdrop.is_open,
            },
            {
                title: "End xDrop",
                info: "End the xDrop permanently. This cannot be undone.",
                btnTxt: "END",
                submit: (tx: Transaction) => XDropModule.admin_ends_xdrop(
                    tx,
                    xdropClient.xdropPkgId,
                    xdrop.type_coin,
                    xdrop.type_network,
                    xdropId,
                ),
                showIf: !xdrop.is_ended,
            },
            {
                title: "Reclaim Balance",
                info: "Reclaim the remaining balance of the xDrop.",
                btnTxt: "RECLAIM",
                submit: (tx: Transaction) => {
                    const [coin] = XDropModule.admin_reclaims_balance(
                        tx,
                        xdropClient.xdropPkgId,
                        xdrop.type_coin,
                        xdrop.type_network,
                        xdropId,
                    );
                    return TransferModule.public_transfer(
                        tx, `0x2::coin::Coin<${xdrop.type_coin}>`, coin, currAcct.address
                    )
                },
                showIf: xdrop.is_ended,
            },
        ].filter(action => action.showIf);

        const onSubmit = async (submit: (tx: Transaction) => TransactionResult) =>
        {
            if (isWorking || !currAcct) return;
            try {
                setIsWorking(true);
                const tx = new Transaction();
                submit(tx);
                const resp = await xdropClient.signAndExecuteTx(tx);
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
