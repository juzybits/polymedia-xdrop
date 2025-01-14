import { useCurrentAccount } from "@mysten/dapp-kit";
import { getCoinMeta } from "@polymedia/coinmeta";
import { REGEX_TYPE_BASIC, shortenAddress } from "@polymedia/suitcase-core";
import { Btn, IconInfo, useDropdown, useInputString } from "@polymedia/suitcase-react";
import { LINK_NETWORKS, LinkNetwork } from "@polymedia/xdrop-sdk";
import React from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "./App";
import { Card } from "./comp/cards";
import { ConnectOr } from "./comp/connect";

export const PageNew: React.FC = () =>
{
    // === state ===

    const navigate = useNavigate();
    const currAcct = useCurrentAccount();
    const { header, xdropClient, isWorking, setIsWorking, setModalContent } = useAppContext();

    // === form state ===

    const linkNetwork = useDropdown<LinkNetwork>({
        label: "Network",
        html: { required: true },
        options: LINK_NETWORKS.map(network => ({ value: network, label: network })),
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

    const showFormInfoModal = () => {
        setModalContent(<>
            <div className="card-title"><IconInfo />Settings</div>
            <div><b>Network:</b> The blockchain where users are coming from.</div>
            <div><b>Coin type:</b> The kind of Sui coin you want to distribute.</div>
        </>);
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
                <div className="card-header">
                    <div className="card-title">
                        Settings
                    </div>
                    <IconInfo onClick={showFormInfoModal} />
                </div>
                <div className="form">
                    <div className="form-section">
                        {linkNetwork.input}
                        {coinType.input}
                    </div>

                    <ConnectOr>
                        <Btn disabled={disableSubmit} onClick={onSubmit}>
                            CREATE
                        </Btn>
                    </ConnectOr>
                </div>
            </Card>

        </div>

    </div>
    </>;
};
