import { ConnectModal, SuiClientProvider, WalletProvider, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router-dom";

import { CoinMetaFetcher } from "@polymedia/suitcase-core";
import { ExplorerName, IconGears, IconHistory, IconNew, Modal, Setter, loadExplorer, loadNetwork } from "@polymedia/suitcase-react";
import { XDropClient, getNetworkConfig } from "@polymedia/xdrop-sdk";

import { Glitch } from "./comp/glitch";
import { AppContext, useAppContext } from "./lib/context";
import { getGraphqlUrl, loadNetworkConfig, SupportedNetwork, supportedNetworks, defaultNetwork } from "./lib/network";
import { PageClaim } from "./PageClaim";
import { PageClean } from "./PageClean";
import { PageDevLink } from "./PageDevLink";
import { PageHome } from "./PageHome";
import { PageLatest } from "./PageLatest";
import { PageManage } from "./PageManage";
import { PageNew } from "./PageNew";
import { PageNotFound } from "./PageNotFound";
import { PageSettings } from "./PageSettings";
import { PageUser } from "./PageUser";
import "./styles/App.less";

// ==== router ====

export const AppRouter = () =>
(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<AppSuiProviders />} >
                <Route index element={<PageHome />} />
                <Route path="/new" element={<PageNew />} />
                <Route path="/claim/:xdropId" element={<PageClaim />} />
                <Route path="/manage/:xdropId" element={<PageManage />} />
                <Route path="/clean" element={<PageClean />} />
                <Route path="/latest" element={<PageLatest />} />
                <Route path="/user" element={<PageUser />} />
                <Route path="/settings" element={<PageSettings />} />
                <Route path="/dev-link" element={<PageDevLink />} />
                <Route path="*" element={<PageNotFound />} />
            </Route>
        </Routes>
    </BrowserRouter>
);

// ==== sui providers ====

const queryClient = new QueryClient();
const AppSuiProviders = () =>
{
    const [ network, setNetwork ] = useState(
        loadNetwork(supportedNetworks, defaultNetwork)
    );

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

// ==== app ====

export type AppContextType = {
    network: SupportedNetwork; setNetwork: Setter<SupportedNetwork>;
    rpc: string; setRpc: Setter<string>;
    explorer: ExplorerName; setExplorer: Setter<ExplorerName>;
    isWorking: boolean; setIsWorking: Setter<boolean>;
    openConnectModal: () => void;
    setModalContent: Setter<React.ReactNode>;
    header: React.ReactNode;
    xdropClient: XDropClient;
    coinMetaFetcher: CoinMetaFetcher;
};


const App = (args: {
    network: SupportedNetwork; setNetwork: Setter<SupportedNetwork>;
    rpc: string; setRpc: Setter<string>;
}) =>
{
    // === state ===

    const [ explorer, setExplorer ] = useState(loadExplorer("Polymedia"));
    const [ modalContent, setModalContent ] = useState<React.ReactNode>(null);
    const [ isWorking, setIsWorking ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);

    const suiClient = useSuiClient();
    const { mutateAsync: walletSignTx } = useSignTransaction();

    const netCnf = getNetworkConfig(args.network);
    const xdropClient = useMemo(() => {
        return new XDropClient({
            graphClient: new SuiGraphQLClient({ url: getGraphqlUrl(args.network) }),
            xdropPkgId: netCnf.xdropPkgId,
            suilinkPkgId: netCnf.suilinkPkgId,
            suiClient,
            signTx: (tx) => walletSignTx({ transaction: tx }),
        });
    }, [suiClient, walletSignTx]);

    const coinMetaFetcher = useMemo(() => {
        return new CoinMetaFetcher({ client: suiClient });
    }, [suiClient]);

    const appContext: AppContextType = {
        network: args.network, setNetwork: args.setNetwork,
        rpc: args.rpc, setRpc: args.setRpc,
        explorer, setExplorer,
        isWorking, setIsWorking,
        openConnectModal: () => { setShowConnectModal(true); },
        setModalContent,
        header: <Header />,
        xdropClient,
        coinMetaFetcher,
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

            {modalContent && <Modal onClose={() => setModalContent(null)}>
                {modalContent}
            </Modal>}

            <Toaster position="top-center" containerStyle={{ marginTop: 23 }} />

        </div>
    </AppContext.Provider>
    );
};

/* One-off components */

const Header = () =>
{
    const { network } = useAppContext();
    return (
    <header>
        <div className="header-item">
            <Link to="/">
                <Glitch text="xDrop" />
                {network !== "mainnet" && <span className="header-network-label">{network}</span>}
            </Link>
        </div>
        <Link to="/new" className="header-item" title="Create Auction">
            <IconNew />
        </Link>
        <Link to="/user" className="header-item" title="Your History">
            <IconHistory />
        </Link>
        <Link to="/settings" className="header-item" title="Settings">
            <IconGears />
        </Link>
    </header>);
};
