import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { XDrop } from "@polymedia/xdrop-sdk";
import { CardSpinner, CardMsg } from "./cards";
import { ConnectToGetStarted } from "./connect";
import { UseXDropResult } from "./hooks";

export const XDropLoader: React.FC<{
    fetched: UseXDropResult;
    requireWallet: boolean;
    children: (xdrop: XDrop, coinMeta: CoinMetadata) => React.ReactNode;
}> = ({
    fetched,
    requireWallet,
    children,
}) => {
    const currAcct = useCurrentAccount();

    if (fetched.err) {
        return <CardMsg>{fetched.err}</CardMsg>;
    }

    if (fetched.isLoading || fetched.data === undefined) {
        return <CardSpinner />;
    }

    const { xdrop, coinMeta } = fetched.data;

    if (xdrop === null || coinMeta === null) {
        return <CardMsg>
            {xdrop === null ? "xDrop not found." : "Coin metadata not found."}
        </CardMsg>;
    }

    if (requireWallet && !currAcct) {
        return <div className="card compact center-text">
            <ConnectToGetStarted />
        </div>;
    }

    return <>{children(xdrop, coinMeta)}</>;
};
