import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { ExplorerRadioSelector, LinkExternal, NetworkRadioSelector, RpcRadioSelector } from "@polymedia/suitcase-react";
import React from "react";
import { supportedNetworks, useAppContext } from "./App";
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
            <SectionExplorer />
            <SectionNetwork />
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

    // === html ===

    return <div className="card compact">
        <div className="card-title">
            Wallet
        </div>
        {!currAcct
            ? <ConnectToGetStarted />
            : <>
                <div>You are connected with address:</div>
                <div className="address">{currAcct.address}</div>
                <div>
                    <button onClick={() => disconnect()} className="btn">
                        DISCONNECT
                        </button>
                    </div>
            </>
        }
        </div>;
};

const SectionExplorer: React.FC = () =>
{
    const { explorer, setExplorer } = useAppContext();

    return <div className="card compact">
        <div className="card-title">
            Explorer
        </div>
        <ExplorerRadioSelector
            selectedExplorer={explorer}
            onSwitch={setExplorer}
        />
    </div>;
};

const SectionNetwork: React.FC = () =>
{
    const { network, setNetwork } = useAppContext();

    return <div className="card compact">
        <div className="card-title">
            Network
        </div>
        <NetworkRadioSelector
            selectedNetwork={network}
            supportedNetworks={supportedNetworks}
            onSwitch={setNetwork}
        />
    </div>;
};


const SectionRpc: React.FC = () =>
{
    // === state ===

    const { network } = useAppContext();
    const { rpc, setRpc } = useAppContext();

    // === html ===

    return <div className="card compact">
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
    </div>;
};
