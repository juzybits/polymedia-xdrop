import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Btn } from "@polymedia/suitcase-react";
import { getNetworkConfig, LINK_NETWORKS, LinkNetwork } from "@polymedia/xdrop-sdk";
import React from "react";
import { useAppContext } from "./App";
import { Card } from "./comp/cards";
import { BtnConnect } from "./comp/connect";

const linkedForeignAddrs: Record<LinkNetwork, string[]> = {
    "Ethereum": [
        "0x0000000000000000000000000000000000000AaA",
        "0x1111111111111111111111111111111111111BbB",
    ],
    "Solana": [
        "Test111AaaaaaaaaaaaaaaaaaaaaaaaaaaaAaA",
        "Test222BbbbbbbbbbbbbbbbbbbbbbbbbbbbBbB"
    ],
};
    // "0xccfbf70e03c97c0137cd3c0b5009e8ad4942b84d",
    // "0xddbac1074966ca45a35455f8710e5bca39e3f8e6",
    // "0xe0180ffc8ecea5744cdf28161760cc61c003c08f",

export const PageDevLink: React.FC = () =>
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
                for (let foreignAddr of linkedForeignAddrs[network]) {
                    if (network === "Ethereum") {
                        foreignAddr = foreignAddr.toLowerCase();
                    }
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
            const resp = await xdropClient.signAndExecuteTx(tx);
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
                <div className="card-description">
                    <p>Link Network: Ethereum</p>
                    <p>Linked Addresses: <pre>{JSON.stringify(linkedForeignAddrs, null, 2)}</pre></p>
                </div>
                <div>
                    {currAcct
                        ? <Btn onClick={onSubmit}>Create</Btn>
                        : <BtnConnect />}
                </div>
            </Card>

        </div>

    </div>
    </>;
};
