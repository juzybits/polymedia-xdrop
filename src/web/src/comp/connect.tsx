import { ReactNode } from "react";

import { BtnConnect as BtnConnectPoly, ConnectToGetStarted as ConnectToGetStartedPoly, ConnectOr as ConnectOrPoly } from "@polymedia/suitcase-react";

import { useAppContext } from "../app/context";

export const BtnConnect = ({ msg }: {
    msg?: string;
}) =>
{
    const { isWorking, openConnectModal } = useAppContext();
    return <BtnConnectPoly
        btnMsg={msg}
        isWorking={isWorking}
        openConnectModal={openConnectModal}
    />;
};

export const ConnectToGetStarted = ({ msg }: {
    msg?: string;
}) =>
{
    const { isWorking, openConnectModal } = useAppContext();
    return <ConnectToGetStartedPoly
        connectMsg={msg}
        isWorking={isWorking}
        openConnectModal={openConnectModal}
    />;
};

export const ConnectOr = ({ children }: {
    children: ReactNode;
}) =>
{
    const { isWorking, openConnectModal } = useAppContext();
    return <ConnectOrPoly isWorking={isWorking} openConnectModal={openConnectModal}>
        {children}
    </ConnectOrPoly>;
};
