import { useCurrentAccount } from "@mysten/dapp-kit";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { REGEX_TYPE_BASIC, shortenAddress } from "@polymedia/suitcase-core";
import { BtnSubmit, IconGears, IconInfo, isLocalhost, useDropdown, useInputString, Card } from "@polymedia/suitcase-react";
import { LINK_NETWORKS, LinkNetwork } from "@polymedia/xdrop-sdk";

import { useAppContext } from "../app/context";
import { ConnectOr } from "../comp/connect";

export const PageNew = () =>
{
    // === state ===

    const navigate = useNavigate();
    const currAcct = useCurrentAccount();
    const { header, xdropClient, coinMetaFetcher, isWorking, setIsWorking } = useAppContext();

    // === form state ===

    const linkNetwork = useDropdown<LinkNetwork>({
        label: "Network",
        html: { required: true },
        options: LINK_NETWORKS.map(network => ({ value: network, label: network })),
        msgRequired: "",
    });

    const coinType = useInputString({
        label: "Coin Type",
        html: { required: true, placeholder: "0x2::sui::SUI", value: devCoinTypeOrEmpty() },
        validateInput: (input: string) => {
            const trimmed = input.trim();
            const match = trimmed.match(`^${REGEX_TYPE_BASIC}$`);
            if (!match) {
                return { err: "Invalid coin type", val: undefined };
            }
            return { err: null, val: trimmed };
        },
        msgRequired: ""
    });

    const hasErrors = [linkNetwork, coinType].some(input => input.err !== null);
    const disableSubmit = !currAcct || isWorking || hasErrors;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const coinMeta = await coinMetaFetcher.getCoinMeta(coinType.val!);
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
            const msg = xdropClient.errToStr(err, "Failed to create xDrop");
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
                New xDrop
            </div>
            <Card>
                <div className="card-title"><IconGears />Settings</div>
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
            <Card>
                <div className="card-title"><IconInfo />Help</div>
                <div className="card-desc">
                    <p>This creates an empty xDrop on Sui. You can add eligible claims to it later.</p>
                    <p><b><i>Network</i></b> is the blockchain where users are coming from.</p>
                    <p><b><i>Coin type</i></b> is the kind of Sui coin you want to distribute.</p>
                </div>
            </Card>
        </div>

    </div>
    </>;
};

function devCoinTypeOrEmpty()
{
    const { network } = useAppContext();
    if (!isLocalhost()) return "";

    if (network === "mainnet")
        return "0xf64a704b8fa0380f6bca10af0c9e5a5d478bbfc50b2a97898a7f1315289c7b54::dogcoin::DOGCOIN";
    if (network === "devnet")
        return "0x485f0ba856d2a966f7da5c9467807ebbc6ad1adb1672e22d20c27d5fa98bd15f::dogcoin::DOGCOIN";

    return "";
}
