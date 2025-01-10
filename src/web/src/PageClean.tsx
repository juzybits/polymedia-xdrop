import { useCurrentAccount } from "@mysten/dapp-kit";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { useXDrop, XDropLoader } from "./comp/loader";
import { PageNotFound } from "./PageNotFound";

export const PageClean: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, isWorking, setIsWorking, explorer, network, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);

    const disableSubmit = isWorking || !currAcct;
    const onSubmit = async () => {
    };

    return <>
        {header}
        <div id="page-clean" className="page-regular">
            <div className="page-content">

                <div className="page-title">
                    Clean xDrop
                </div>

                <XDropLoader fetched={fetched} requireWallet={true}>
                {(xdrop, coinMeta) =>
                {
                    return <h2>WIP</h2>;
                }}
                </XDropLoader>

            </div>
        </div>
    </>;
};
