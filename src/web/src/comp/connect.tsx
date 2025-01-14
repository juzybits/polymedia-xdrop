import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useAppContext } from "../App";
import { BtnSubmit } from "./buttons";

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
        <BtnSubmit disabled={isWorking} onClick={connectWallet}>
            CONNECT
        </BtnSubmit>
    );
};

export const ConnectToGetStarted: React.FC = () =>
{
    return <>
        <div className="card-desc">
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
