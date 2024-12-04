import { useCurrentAccount } from "@mysten/dapp-kit";
import { useDropdown, useInputString } from "@polymedia/suitcase-react";
import { LINK_NETWORKS, LinkNetwork } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { SubmitRes } from "./lib/misc";

export const PageNew: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { header, xdropClient, isWorking, setIsWorking } = useAppContext();

    // === form state ===

    const coinType = useInputString({
        label: "Coin Type",
        html: { required: true },
    });
    const linkNetwork = useDropdown<LinkNetwork>({
        label: "Network",
        html: { required: true },
        options: LINK_NETWORKS.map(network => ({
            value: network, label: network.charAt(0).toUpperCase() + network.slice(1)
        })),
    });
    const hasErrors = [coinType, linkNetwork].some(input => input.err !== undefined);
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });
    const disableSubmit = hasErrors || isWorking || !currAcct;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });
            const { resp, xdropObjChange } = await xdropClient.adminCreatesAndSharesXDrop(
                coinType.val!, linkNetwork.val!
            );
            console.debug("[onSubmit] resp:", resp);
            console.debug("[onSubmit] objChange:", xdropObjChange);
            console.debug("[onSubmit] obj ID:", xdropObjChange?.objectId);
            setSubmitRes({ ok: true });
        } catch (err) {
            // const errMsg = xdropClient.errCodeToStr(err, "Failed to create xDrop"); // TODO
            console.warn("[onSubmit] error:", err);
            setSubmitRes({ ok: false, err: "Failed to create xDrop" });
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    return <>
    {header}
    <div id="page-new" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Create xDrop
            </div>
            <div className="card compact">
                <div className="card-title center-element center-text">
                    Settings
                </div>
                <div className="form">
                    <div className="form-section">
                        {linkNetwork.input}
                        {coinType.input}
                    </div>

                    <Btn onClick={onSubmit} disabled={disableSubmit}>
                        CREATE
                    </Btn>

                    {submitRes.ok === false && submitRes.err &&
                    <div className="error">{submitRes.err}</div>}
                </div>
            </div>

        </div>

    </div>
    </>;
};
