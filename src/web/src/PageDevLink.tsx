import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Btn } from "@polymedia/suitcase-react";
import { getNetworkConfig } from "@polymedia/xdrop-sdk";
import React from "react";
import { useAppContext } from "./App";
import { BtnConnect } from "./comp/connect";

export const devClaims = [
    { foreignAddr: "0x0000000000000000000000000000000000000000", amount: 100n * 1_000_000_000n },
    { foreignAddr: "0x1111111111111111111111111111111111111111", amount: 200n * 1_000_000_000n },
    // { foreignAddr: "0xccfbf70e03c97c0137cd3c0b5009e8ad4942b84d", amount: 5000n * 1_000_000_000n },
    // { foreignAddr: "0xddbac1074966ca45a35455f8710e5bca39e3f8e6", amount: 5000n * 1_000_000_000n },
    // { foreignAddr: "0xe0180ffc8ecea5744cdf28161760cc61c003c08f", amount: 5000n * 1_000_000_000n },
];

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
            for (const foreignAddr of devClaims.map(c => c.foreignAddr)) {
                tx.moveCall({
                    package: netCnf.suilinkPkgId,
                    module: "ethereum",
                    function: "dev_link",
                    arguments: [
                        tx.pure.address(currAcct.address),
                        tx.pure.string(foreignAddr),
                    ],
                });
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

            <div className="card compact">
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-description">
                    <p>Link Network: Ethereum</p>
                    <p>Linked Addresses: {devClaims.map(c => c.foreignAddr).join(", ")}</p>
                </div>
                <div>
                    {currAcct
                        ? <Btn working={isWorking} onClick={onSubmit}>Create</Btn>
                        : <BtnConnect />}
                </div>
            </div>

        </div>

    </div>
    </>;
};
