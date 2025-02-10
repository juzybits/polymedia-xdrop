import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";

import { BtnSubmit } from "@polymedia/suitcase-react";

import { useAppContext } from "../app/context";

export const BtnConnect = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { isWorking, openConnectModal } = useAppContext();

    const connectWallet = () => {
        currAcct ? disconnect() : openConnectModal();
    };

    return (
        <BtnSubmit disabled={isWorking} onClick={() => Promise.resolve(connectWallet())}>
            CONNECT
        </BtnSubmit>
    );
};

export const ConnectToGetStarted = ({
    msg,
}: {
    msg?: string;
}) =>
{
    return <>
        {msg && <div className="card-desc">{msg}</div>}
        <BtnConnect />
    </>;
};

export const ConnectOr = ({
    children
}: {
    children: React.ReactNode;
}) =>
{
    const currAcct = useCurrentAccount();
    return <>
        {!currAcct ? <ConnectToGetStarted /> : children}
    </>;
};
