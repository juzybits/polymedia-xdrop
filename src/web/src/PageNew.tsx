import { useCurrentAccount } from "@mysten/dapp-kit";
import { getCoinMeta } from "@polymedia/coinmeta";
import { REGEX_TYPE_BASIC, shortenAddress } from "@polymedia/suitcase-core";
import { useDropdown, useInputString } from "@polymedia/suitcase-react";
import { LINK_NETWORKS, LinkNetwork } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { ResultMsg, SubmitRes } from "./comps/submits";

export const PageNew: React.FC = () =>
{
    // === state ===

    const navigate = useNavigate();
    const currAcct = useCurrentAccount();
    const { header, xdropClient, isWorking, setIsWorking } = useAppContext();

    // === form state ===

    const linkNetwork = useDropdown<LinkNetwork>({
        label: "Network",
        html: { required: true },
        options: LINK_NETWORKS.map(network => ({
            value: network, label: network.charAt(0).toUpperCase() + network.slice(1)
        })),
    });

    const coinType = useInputString({
        label: "Coin Type",
        html: { required: true },
        validate: (input: string) => {
            const trimmed = input.trim();
            const match = trimmed.match(REGEX_TYPE_BASIC);
            if (!match) {
                return { err: "Invalid coin type", val: undefined };
            }
            return { err: null, val: trimmed };
        },
    });

    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const hasErrors = [linkNetwork, coinType].some(input => !!input.err);
    const disableSubmit = !currAcct || isWorking || hasErrors;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });

            const coinMeta = await getCoinMeta(xdropClient.suiClient, coinType.val!);
            if (!coinMeta) {
                throw new Error(`CoinMetadata not found for type ${shortenAddress(coinType.val!)}`);
            }

            const { resp, xdropObjChange } = await xdropClient.adminCreatesAndSharesXDrop(
                coinType.val!, linkNetwork.val!
            );
            console.debug("[onSubmit] resp:", resp);
            console.debug("[onSubmit] objChange:", xdropObjChange);
            console.debug("[onSubmit] obj ID:", xdropObjChange.objectId);
            setSubmitRes({ ok: true });
            navigate(`/manage/${xdropObjChange.objectId}`, {
                state: { justCreated: true },
            });
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            setSubmitRes({ ok: false, err: xdropClient.errParser.errToStr(err, "Failed to create xDrop") });
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
                    <ResultMsg res={submitRes} />
                </div>
            </div>

        </div>

    </div>
    </>;
};
