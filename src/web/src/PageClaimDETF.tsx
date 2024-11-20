import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch } from "@polymedia/suitcase-react";
import { LinkNetwork } from "@polymedia/xdrop-sdk";
import React, { useEffect } from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";

const xdropId = "0x123";
const coinType = "0x123::detf::detf";
const coinDecimals = 9;
const linkNetwork: LinkNetwork = "ethereum";

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
                    <p>Prove ownership of your Ethereum address by linking it to your Sui address.</p>
                </div>
                <div className="card-description">
                    If you hold DETF in multiple wallets, you can link all of them to the same Sui address.
                </div>
                <div className="center-element">
                    <LinkExternal className="btn" href="https://www.suilink.io/">LINK ADDRESS</LinkExternal>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 2: Claim your DETF on Sui</p>
                </div>
                <div className="card-description">
                    Once your Ethereum address is linked, you can claim the same amount of Sui DETF as you hold on Ethereum.
                </div>
                {!currAcct
                    ? <>
                        <div className="card-description">
                            Connect your Sui wallet to claim.
                        </div>
                        <div className="center-element">
                            <BtnConnect />
                        </div>
                    </>
                : <>
                    <div className="card-description">
                        <p>You are connected as {shortenAddress(currAcct.address)} (<a onClick={() => disconnect()}>disconnect</a>).</p>
                    </div>
                    <ClaimWidget currAddr={currAcct.address} />
                </>}
            </div>

        </div>

    </div>
    </>;
};

const ClaimWidget: React.FC<{
    currAddr: string;
}> = ({
    currAddr,
}) =>
{

    const { xdropClient } = useAppContext();

    const links = useFetch(
        async () => await xdropClient.fetchOwnedLinks(currAddr, linkNetwork),
        [currAddr, linkNetwork]
    );

    const statuses = useFetch(
        async () => {
            if (!links.data) { return undefined; }
            return await xdropClient.fetchLinkStatuses(
                coinType, linkNetwork, xdropId, links.data.map(l => l.network_address)
            );
        },
        [coinType, linkNetwork, xdropId, links.data]
    );

    useEffect(() => {
        if (links.data) { console.log(JSON.stringify(links.data, null, 2)); }
    }, [links]);

    return <>
        <div className="center-element">
            <Btn onClick={() => {}}>CLAIM DETF</Btn>
        </div>
    </>;
};
