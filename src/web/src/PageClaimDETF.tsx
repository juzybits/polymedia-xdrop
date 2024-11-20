import React from "react";
import { useAppContext } from "./App";
import { IconInfo } from "./comps/icons";
import { LinkExternal } from "@polymedia/suitcase-react";

// xdrop.polymedia.app/claim-detf

export const PageClaimDETF: React.FC = () =>
{
    const coinType = "0x123::detf::detf";
    const coinDecimals = 9;

    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-claim" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Claim Sui DETF
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 1: Link your Ethereum address</p>
                </div>
                <div className="card-description">
                    <p>
                        Go to <LinkExternal href="https://www.suilink.io/">SuiLink</LinkExternal> to prove ownership of your Ethereum address.
                    </p>
                    <p>
                        If you hold DETF in multiple wallets, you can link them all to the same Sui address.
                    </p>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 2: Claim your DETF on Sui</p>
                </div>
                <div className="card-description">
                    <p>
                        Once your Ethereum address is linked, you can claim the same amount of Sui DETF as you hold in Ethereum.
                    </p>
                </div>
            </div>

        </div>

    </div>
    </>;
};
