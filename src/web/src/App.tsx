import {
    ConnectModal,
    SuiClientProvider,
    WalletProvider, useCurrentAccount, useDisconnectWallet, useSignTransaction, useSuiClient
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { ExplorerName, ReactSetter, isLocalhost, loadExplorer, loadNetwork } from "@polymedia/suitcase-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserProvider } from "ethers";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import "./styles/App.less";

/* App router */

export const AppRouter: React.FC = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<AppSuiProviders />} >
                <Route index element={<PageHome />} />
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
    : /* prod */     ["mainnet"  as const, ["mainnet", "testnet"] as const];

export { supportedNetworks };

export type NetworkName = typeof supportedNetworks[number];

const queryClient = new QueryClient();
const AppSuiProviders: React.FC = () =>
{
    const [ network, setNetwork ] = useState(loadNetwork(supportedNetworks, defaultNetwork));

    const [ networkConfig, setNetworkConfig ] = useState({
        mainnet: { url: getFullnodeUrl("mainnet") },
        testnet: { url: getFullnodeUrl("testnet") },
        devnet: { url: getFullnodeUrl("devnet") },
        localnet: { url: getFullnodeUrl("localnet") },
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
    // header: React.ReactNode;
    suiClient: SuiClient;
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

    const suiClient = useSuiClient();

    const [ explorer, setExplorer ] = useState(loadExplorer("Polymedia"));
    const [ modalContent, setModalContent ] = useState<React.ReactNode>(null);

    const [ isWorking, setIsWorking ] = useState(false);
    // const [ showMobileNav, setShowMobileNav ] = useState(false);
    const [ showConnectModal, setShowConnectModal ] = useState(false);

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
        // header: <Header />,
        suiClient,
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

// const Header: React.FC = () =>
// {
//     const { network } = useAppContext();
//     const currAcct = useCurrentAccount();
//     return <header>
//         <div className="header-item">
//             <Link to="/">
//                 <Glitch text="XDROP" />
//                 {network !== "mainnet" && <span className="header-network-label">{network}</span>}
//             </Link>
//         </div>
//         <Link to="/new" className="header-item" title="Create XDrop">
//             <IconNew />
//         </Link>
//         {currAcct && <Link to={`/user/${currAcct.address}/bids`} className="header-item" title="Your History">
//             <IconHistory />
//         </Link>}
//         <Link to="/settings" className="header-item" title="Settings">
//             <IconGears />
//         </Link>
//     </header>;
// };

/* quick and dirty */

export const PageHome: React.FC = () => {
    return (
        <div>
            <h1>Welcome to SuiLink</h1>
            <EthereumSigner />
            <SuiSigner />
        </div>
    );
};

const MESSAGE = `Welcome to SuiLink!

Simply sign this message to connect your Ethereum address to your Sui address. It's quick and secure, plus no transaction or gas fees.

Ethereum address: {ETH_ADDRESS}
Sui Address: {SUI_ADDRESS}`;

const EthereumSigner: React.FC = () =>
{
    const [account, setAccount] = useState<string>("");
    const [signature, setSignature] = useState<string>("");
    const [error, setError] = useState<string>("");

    const connectWallet = useCallback(async () => {
        try {
            if (!window.ethereum) {
                throw new Error("Please install MetaMask or another Ethereum wallet");
            }

            const provider = new BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            setAccount(accounts[0]);
            setError("");
        } catch (err) {
            setError("Failed to connect wallet");
            console.error(err);
        }
    }, []);

    const signMessage = useCallback(async () => {
        if (!window.ethereum || !account) {
            setError("Please connect your wallet first");
            return;
        }

        try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Using a test Sui address for now
            const messageToSign = MESSAGE
                .replace("{ETH_ADDRESS}", `0x${account.toLowerCase().slice(2)}`)
                .replace("{SUI_ADDRESS}", "...");

            const signature = await signer.signMessage(messageToSign);

            setSignature(signature);
            setError("");

            console.log("Signature:", signature);

        } catch (err) {
            setError("Failed to sign message");
            console.error(err);
        }
    }, [account]);

    return (
        <div>
            {!account ? (
                <button onClick={connectWallet}>
                    Connect Ethereum Wallet
                </button>
            ) : (
                <div>
                    <p>Connected: {account}</p>
                    <button onClick={signMessage}>
                        Sign Message
                    </button>
                </div>
            )}

            {error && (
                <p style={{ color: "red" }}>{error}</p>
            )}

            {signature && (
                <div>
                    <p><strong>Signature:</strong></p>
                    <p>{signature}</p>
                </div>
            )}
        </div>
    );
};

function hexToBytes(hex: string) {
    // Remove '0x' prefix if present
    hex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return bytes;
}

const SuiSigner: React.FC = () => {
    // === state ===

    const currAcct = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: disconnect } = useDisconnectWallet();
    const { mutateAsync: walletSignTx } = useSignTransaction();

    async function link() {
        if (!currAcct) {
            return;
        }

        const tx = new Transaction();
        tx.moveCall({
            target: "0x358fb2cf8d041bbcdb46f0782ff23fb88c3fe15d10f481b721344241e6692a9b::ethereum::link_v3",
            arguments: [
                tx.object("0xc0353bf80ec9dd14e0e8e5e3b19057fdcb52b9d8c205113defc26ed96747b878"), // registry
                tx.pure.vector("u8", hexToBytes("...")), // signature
                tx.object.clock(),
                tx.pure.string("..."), // eth address TODO
            ],
        });
        const signedTx = await walletSignTx({ transaction: tx });

        const txResponseOptions = { showEffects: true, showObjectChanges: true };
        const waitForTxOptions = { timeout: 60_000, pollInterval: 333 };

        try {
            console.log("Sending transaction...");
            const resp = await suiClient.executeTransactionBlock({
                transactionBlock: signedTx.bytes,
                signature: signedTx.signature,
                options: txResponseOptions,
            });
            console.log("Transaction sent, waiting for confirmation...");
            return await suiClient.waitForTransaction({
                digest: resp.digest,
                options: txResponseOptions,
                timeout: waitForTxOptions.timeout,
                pollInterval: waitForTxOptions.pollInterval,
            });
        } catch (err) {
            console.error(err);
        }
    }

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
                    <button onClick={link} className="btn">LINK</button>
                </div>
            </>
        }
        </div>;
};

export const ConnectToGetStarted: React.FC = () =>
    {
        return (
            <>
                <div className="card-description">
                    Connect your Sui wallet to get started.
                </div>
                <BtnConnect />
            </>
        );
    };

    export const BtnConnect: React.FC = () =>
    {
        // === state ===

        const currAcct = useCurrentAccount();
        const { mutate: disconnect } = useDisconnectWallet();

        const { isWorking, openConnectModal } = useAppContext();

        const connectWallet = () => {
            currAcct ? disconnect() : openConnectModal();
        };

        return (
            <button className="btn" disabled={isWorking} onClick={connectWallet}>
                CONNECT
            </button>
        );
    };
