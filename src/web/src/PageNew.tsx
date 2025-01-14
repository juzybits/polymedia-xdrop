import { useCurrentAccount } from "@mysten/dapp-kit";
import { getCoinMeta } from "@polymedia/coinmeta";
import { REGEX_TYPE_BASIC, shortenAddress } from "@polymedia/suitcase-core";
import { Btn, useDropdown, useInputString } from "@polymedia/suitcase-react";
import { LINK_NETWORKS, LinkNetwork } from "@polymedia/xdrop-sdk";
import React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "./App";
import { Card } from "./comp/cards";
import { ConnectOr } from "./comp/connect";
import { BtnSubmit } from "./comp/buttons";

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
        options: LINK_NETWORKS.map(network => ({ value: network, label: network })),
        msgRequired: "Select the chain where users are coming from",
    });

    const coinType = useInputString({
        label: "Coin Type",
        html: { required: true, placeholder: "0x2::sui::SUI" },
        validateInput: (input: string) => {
            const trimmed = input.trim();
            const match = trimmed.match(`^${REGEX_TYPE_BASIC}$`);
            if (!match) {
                return { err: "Invalid coin type", val: undefined };
            }
            return { err: null, val: trimmed };
        },
        msgRequired: "Enter the kind of Sui coin to distribute"
    });

    const hasErrors = [linkNetwork, coinType].some(input => !!input.err);
    const disableSubmit = !currAcct || isWorking || hasErrors;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const coinMeta = await getCoinMeta(xdropClient.suiClient, coinType.val!);
            if (!coinMeta) {
                throw new Error(`CoinMetadata not found for type ${shortenAddress(coinType.val)}`);
            }
            const { resp, xdropObjChange } = await xdropClient.adminCreatesAndSharesXDrop(
                coinType.val!, linkNetwork.val!
            );
            console.debug("[onSubmit] resp:", resp);
            console.debug("[onSubmit] objChange:", xdropObjChange);
            console.debug("[onSubmit] obj ID:", xdropObjChange.objectId);
            toast.success("Success");
            navigate(`/manage/${xdropObjChange.objectId}`, {
                state: { justCreated: true },
            });
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errParser.errToStr(err, "Failed to create xDrop");
            msg && toast.error(msg);
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
            <Card>
                <div className="card-title">
                    Settings
                </div>
                <div className="form">
                    <div className="form-section">
                        {linkNetwork.input}
                        {coinType.input}
                    </div>

                    <ConnectOr>
                        <BtnSubmit disabled={disableSubmit} onClick={onSubmit}>
                            CREATE
                        </BtnSubmit>
                    </ConnectOr>
                </div>
            </Card>

        </div>

    </div>
    </>;
};
