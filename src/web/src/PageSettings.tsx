import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import React from "react";

import { ExplorerRadioSelector, LinkExternal, LinkToExplorer, NetworkRadioSelector, RpcRadioSelector } from "@polymedia/suitcase-react";

import { supportedNetworks, useAppContext } from "./App";
import { BtnSubmit } from "./comp/buttons";
import { Card } from "./comp/cards";
import { ConnectToGetStarted } from "./comp/connect";
import { RPC_ENDPOINTS } from "./lib/network";

export const PageSettings: React.FC = () =>
{
    // === state ===

    const { header } = useAppContext();

    // === html ===

    return <>
    {header}
    <div id="page-settings" className="page-regular">

        <div className="page-content">
            <div className="page-title">SETTINGS</div>
            <SectionConnection />
            <SectionNetwork />
            <SectionExplorer />
            <SectionRpc />
        </div>

    </div>
    </>;
};

const SectionConnection: React.FC = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();
    const { explorer, network } = useAppContext();

    // === html ===

    return (
    <Card>
        <div className="card-title">
            Wallet
        </div>
        {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div>Connected: <LinkToExplorer addr={currAcct.address} kind="address" explorer={explorer} network={network} /></div>
                <BtnSubmit onClick={() => Promise.resolve(disconnect())}>
                    DISCONNECT
                </BtnSubmit>
            </>
        }
    </Card>);
};

const SectionExplorer: React.FC = () =>
{
    const { explorer, setExplorer } = useAppContext();

    return (
    <Card>
        <div className="card-title">
            Explorer
        </div>
        <ExplorerRadioSelector
            selectedExplorer={explorer}
            onSwitch={setExplorer}
        />
    </Card>);
};

const SectionNetwork: React.FC = () =>
{
    const { network, setNetwork } = useAppContext();

    if (supportedNetworks.length === 1) return null;

    return (
    <Card>
        <div className="card-title">
            Network
        </div>
        <NetworkRadioSelector
            selectedNetwork={network}
            supportedNetworks={supportedNetworks}
            onSwitch={setNetwork}
        />
    </Card>);
};


const SectionRpc: React.FC = () =>
{
    // === state ===

    const { network } = useAppContext();
    const { rpc, setRpc } = useAppContext();

    // === html ===

    return (
    <Card>
        <div className="card-title">
            RPC
        </div>
        <RpcRadioSelector
            network={network}
            selectedRpc={rpc}
            supportedRpcs={RPC_ENDPOINTS[network]}
            onSwitch={setRpc}
        />
        {network === "mainnet" &&
        <div>
            Not sure? <LinkExternal href="https://rpcs.polymedia.app">
                Find the fastest RPC for you
            </LinkExternal>.
        </div>}
    </Card>);
};
