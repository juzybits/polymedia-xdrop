import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useAppContext } from "../App";

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

export const ConnectToGetStarted: React.FC = () =>
{
    return <>
        <div className="card-description">
            Connect your Sui wallet to get started.
        </div>
        <BtnConnect />
    </>;
};

export const ConnectOr: React.FC<{
    children: React.ReactNode;
}> = ({ children }) =>
{
    const currAcct = useCurrentAccount();
    return <>
        {!currAcct ? <ConnectToGetStarted /> : children}
    </>;
};
