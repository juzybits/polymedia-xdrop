import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

import { BtnSubmit, Card } from "@polymedia/suitcase-react";
import { getNetworkConfig, LINK_NETWORKS, validateAndNormalizeNetworkAddr } from "@polymedia/xdrop-sdk";

import { DEV_LINKED_FOREIGN_ADDRS } from "../app/config";
import { useAppContext } from "../app/context";
import { BtnConnect } from "../comp/connect";

export const PageDevLink = () =>
{
    // === state ===

    const currAcct = useCurrentAccount();

    const { header, network, xdropClient, isWorking, setIsWorking } = useAppContext();
    const netCnf = getNetworkConfig(network);
    const disableSubmit = isWorking || !currAcct;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const tx = new Transaction();
            for (const network of LINK_NETWORKS) {
                for (let foreignAddr of DEV_LINKED_FOREIGN_ADDRS[network]) {
                    foreignAddr = validateAndNormalizeNetworkAddr(network, foreignAddr);
                    tx.moveCall({
                        package: netCnf.suilinkPkgId,
                        module: network.toLowerCase(),
                        function: "dev_link",
                        arguments: [
                            tx.pure.address(currAcct.address),
                            tx.pure.string(foreignAddr),
                        ],
                    });
                }
            }
            const resp = await xdropClient.signAndExecuteTx({ tx });
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    return <>
    {header}
    <div id="page-dev-link" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Dev Link
            </div>

            <Card>
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-desc">
                    <p>Link Network: Ethereum</p>
                    <p>Linked Addresses:</p>
                    <pre>{JSON.stringify(DEV_LINKED_FOREIGN_ADDRS, null, 2)}</pre>
                </div>
                <div>
                    {currAcct
                        ? <BtnSubmit onClick={onSubmit}>Create</BtnSubmit>
                        : <BtnConnect />}
                </div>
            </Card>

        </div>

    </div>
    </>;
};
