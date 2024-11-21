import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch } from "@polymedia/suitcase-react";
import React, { useEffect } from "react";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { getAppConfig, AppConfig } from "./lib/config";
import { CardSpinner, CardWithMsg } from "./comps/cards";

export const PageClaimDETF: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { header, network } = useAppContext();
    const appCnf = getAppConfig(network);

    return <>
    {header}
    <div id="page-claim" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Claim Sui {appCnf.coinTicker}
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 1: Link your Ethereum address</p>
                </div>
                <div className="card-description">
                    <p>Prove ownership of your Ethereum address by linking it to your Sui address.</p>
                </div>
                <div className="card-description">
                    If you hold {appCnf.coinTicker} in multiple wallets, you can link all of them to the same Sui address.
                </div>
                <div className="center-element">
                    <LinkExternal className="btn" href="https://www.suilink.io/">LINK ADDRESS</LinkExternal>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 2: Claim your {appCnf.coinTicker} on Sui</p>
                </div>
                <div className="card-description">
                    Once your Ethereum address is linked, you can claim the same amount of Sui {appCnf.coinTicker} as you hold on Ethereum.
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
                    <ClaimWidget currAddr={currAcct.address} appCnf={appCnf} />
                </>}
            </div>

        </div>

    </div>
    </>;
};

const ClaimWidget: React.FC<{
    currAddr: string;
    appCnf: AppConfig;
}> = ({
    currAddr,
    appCnf,
}) =>
{
    const { xdropClient } = useAppContext();

    const links = useFetch(
        async () => await xdropClient.fetchOwnedLinks(currAddr, appCnf.linkNetwork),
        [currAddr, appCnf.linkNetwork]
    );

    const amounts = useFetch(
        async () => {
            if (!links.data) { return undefined; }
            return await xdropClient.getClaimableAmounts(
                appCnf.coinType, appCnf.linkNetwork, appCnf.xdropId, links.data.map(l => l.network_address)
            );
        },
        [appCnf.coinType, appCnf.linkNetwork, appCnf.xdropId, links.data]
    );

    useEffect(() => {
        if (links.data) {
            console.log("Owned links:",JSON.stringify(links.data, null, 2));
        }
    }, [links]);

    useEffect(() => {
        if (amounts.data) {
            console.log("Claimable amounts:",JSON.stringify(amounts.data, null, 2));
        }
    }, [amounts]);

    // === html ===

    if (links.error || amounts.error) {
        return <CardWithMsg className="compact">{links.error ?? amounts.error}</CardWithMsg>;
    } else if (links.isLoading || amounts.isLoading) {
        return <CardSpinner />;
    }

    return <>
            <div className="card-title">Claimable amounts</div>
            <div className="card-description">
                {amounts.isLoading && <CardSpinner />}
                {amounts.data && JSON.stringify(amounts.data, null, 2)}
            </div>
        <div className="center-element">
            <Btn onClick={() => {}}>CLAIM {appCnf.coinTicker}</Btn>
        </div>
    </>;
};
