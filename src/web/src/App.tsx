import {
    ConnectModal,
    SuiClientProvider,
    WalletProvider,
    useSignTransaction,
    useSuiClient,
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { SuiClient } from "@mysten/sui/client";
import { ExplorerName, ReactSetter, isLocalhost, loadExplorer, loadNetwork } from "@polymedia/suitcase-react";
import { OBJECT_IDS, XDropClient } from "@polymedia/xdrop-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";
import { Glitch } from "./comps/glitch";
import { IconInfo } from "./comps/icons";
import { loadNetworkConfig } from "./lib/network";
import { PageAbout } from "./PageAbout";
import { PageClaimDETF } from "./PageClaimDETF";
import { PageHome } from "./PageHome";
import { PageNew } from "./PageNew";
import { PageNotFound } from "./PageNotFound";
import "./styles/App.less";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<AppSuiProviders />} >
                <Route index element={<PageHome />} />
                <Route path="/about" element={<PageAbout />} />
                <Route path="/claim-detf" element={<PageClaimDETF />} />
                <Route path="/new" element={<PageNew />} />
                <Route path="*" element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
    );
};

/* Sui providers + network config */

const isDevDomain = "dev.polymedia-xdrop.pages.dev" === window.location.hostname;
const isTestDomain = "test.polymedia-xdrop.pages.dev" === window.location.hostname;

const [ defaultNetwork, supportedNetworks ] =
    isLocalhost()  ? ["localnet" as const, ["mainnet", "testnet", "devnet", "localnet"] as const]
    : isDevDomain  ? ["devnet"   as const, ["devnet"] as const]
    : isTestDomain ? ["testnet"  as const, ["testnet"] as const]
    : /* prod */     ["mainnet"  as const, ["mainnet"] as const];

export { supportedNetworks };

export type NetworkName = typeof supportedNetworks[number];

const queryClient = new QueryClient();
const AppSuiProviders: React.FC = () =>
{
    const [ network, setNetwork ] = useState(loadNetwork(supportedNetworks, defaultNetwork));

    const [ networkConfig, setNetworkConfig ] = useState({
        mainnet: loadNetworkConfig("mainnet"),
        testnet: loadNetworkConfig("testnet"),
        devnet: loadNetworkConfig("devnet"),
        localnet: loadNetworkConfig("localnet"),
    });

    const rpc = networkConfig[network].url;
    const setRpc = (rpc: string) => {
        setNetworkConfig({
            ...networkConfig,
            [network]: { url: rpc },
        });
    };

    return (
    <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} network={network}>
            <WalletProvider autoConnect={true}>
                <App network={network} setNetwork={setNetwork} rpc={rpc} setRpc={setRpc} />
            </WalletProvider>
        </SuiClientProvider>
    </QueryClientProvider>
    );
};

/* App */

const AppContext = createContext<AppContext | null>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within an AppContextProvider");
    }
    return context;
};

export type AppContext = {
    explorer: ExplorerName; setExplorer: ReactSetter<ExplorerName>;
    network: NetworkName; setNetwork: ReactSetter<NetworkName>;
    rpc: string; setRpc: (rpc: string) => void;
    isWorking: boolean; setIsWorking: ReactSetter<boolean>;
    // showMobileNav: boolean; setShowMobileNav: ReactSetter<boolean>;
    openConnectModal: () => void;
    setModalContent: ReactSetter<React.ReactNode>;
    header: React.ReactNode;
    xdropClient: XDropClient;
};

const App: React.FC<{
    network: NetworkName;
    setNetwork: ReactSetter<NetworkName>;
    rpc: string;
    setRpc: (rpc: string) => void;
}> = ({
    network,
    setNetwork,
    rpc,
    setRpc,
}) =>
{
    // === state ===

    const [ explorer, setExplorer ] = useState(loadExplorer("Polymedia"));
    const [ modalContent, setModalContent ] = useState<React.ReactNode>(null);
    const [ isWorking, setIsWorking ] = useState(false);
    // const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);

    const suiClient = useSuiClient();
    const { mutateAsync: walletSignTx } = useSignTransaction();
    const xdropClient = useMemo(() => {
        return new XDropClient({
            network,
            xdropPkgId: OBJECT_IDS[network].xdropPkgId,
            suilinkPkgId: OBJECT_IDS[network].suilinkPkgId,
            suiClient,
            signTransaction: (tx) => walletSignTx({ transaction: tx }),
        });
    }, [suiClient, walletSignTx]);

    const openConnectModal = () => {
        setShowConnectModal(true);
    };

    const appContext: AppContext = {
        explorer, setExplorer,
        network, setNetwork,
        rpc, setRpc,
        isWorking, setIsWorking,
        // showMobileNav, setShowMobileNav,
        openConnectModal: openConnectModal,
        setModalContent,
        header: <Header />,
        xdropClient,
    };

    // === effects ===

    useEffect(() => {
        if (modalContent) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }
        return () => { // cleanup
            document.body.classList.remove("modal-open");
        };
    }, [modalContent]);

    // === html ===

    const layoutClasses: string[] = [];
    // if (showMobileNav) {
    //     layoutClasses.push("menu-open");
    // }
    if (isWorking) {
        layoutClasses.push("disabled");
    }

    return (
    <AppContext.Provider value={appContext}>
        <div id="layout" className={layoutClasses.join(" ")}>

            <Outlet /> {/* Loads a Page*.tsx */}

            <ConnectModal
                trigger={<></>}
                open={showConnectModal}
                onOpenChange={isOpen => { setShowConnectModal(isOpen); }}
            />

            {/* {modalContent && <Modal onClose={() => setModalContent(null)}>
                {modalContent}
            </Modal>} */}

        </div>
    </AppContext.Provider>
    );
};

/* One-off components */

const Header: React.FC = () =>
{
    const { network } = useAppContext();
    return <header>
        <div className="header-item">
            <Link to="/">
                <Glitch text="XDROP" />
                {network !== "mainnet" && <span className="header-network-label">{network}</span>}
            </Link>
        </div>
        <Link to="/about" className="header-item" title="About">
            <IconInfo />
        </Link>
    </header>;
};
