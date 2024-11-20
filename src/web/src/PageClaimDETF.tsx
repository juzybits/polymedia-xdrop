import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal } from "@polymedia/suitcase-react";
import React from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";

const coinType = "0x123::detf::detf";
const coinDecimals = 9;

export const PageClaimDETF: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

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
                    <div>
                        Go to <LinkExternal href="https://www.suilink.io/">SuiLink</LinkExternal> to prove ownership of your Ethereum address.
                    </div>
                    <div>
                        If you hold DETF in multiple wallets, you can link them all to the same Sui address.
                    </div>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 2: Claim your DETF on Sui</p>
                </div>
                <div className="card-description">
                    <div>
                        Once your Ethereum address is linked, you can claim the same amount of Sui DETF as you hold in Ethereum.
                    </div>
                    <div>
                        {!currAcct
                        ? <>
                            <div>Connect your Sui wallet to claim.</div>
                            <BtnConnect />
                        </>
                        : <>
                            <div>You are connected as {shortenAddress(currAcct.address)}. <a onClick={() => disconnect()}>Disconnect</a></div>
                            <Btn onClick={() => {}}>CLAIM DETF</Btn>
                        </>}
                    </div>
                </div>
            </div>

        </div>

    </div>
    </>;
};
