import { useCurrentAccount } from "@mysten/dapp-kit";
import { formatBalance } from "@polymedia/suitcase-core";
import { useTextArea } from "@polymedia/suitcase-react";
import { getSuiLinkNetworkType } from "@polymedia/xdrop-sdk";
import React from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { BtnConnect } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

export const PageAddClaims: React.FC = () =>
{
    // === state ===

    const { xdropId } = useParams();
    if (xdropId !== "detf") { return <PageNotFound />; }

    const currAcct = useCurrentAccount();

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();
    const xCnf = appCnf[xdropId];

    const textArea = useTextArea<{
        claims: { addr: string, amount: bigint }[],
        totalAmount: bigint,
    }>({
        label: "Claims (format: address,amount)",
        msgRequired: "Claims are required.",
        html: {
            value: (() => {
                const rows = Array.from({ length: 1000 }, () => {
                    // Generate random Ethereum address (40 hex chars)
                    const addr = '0x' + Array.from({ length: 40 }, () =>
                        Math.floor(Math.random() * 16).toString(16)
                    ).join('');
                    // Random amount between 1 and 100
                    const amount = Math.floor(Math.random() * (100 * 10**xCnf.coinDecimals)) + 1;
                    return `${addr},${amount}`;
                });
                return rows.join('\n');
            })(),
            required: true,
            placeholder: "0x1234...5678,1000\n0x8765...4321,2000",
        },
        validate: (input) => {
            if (!input) {
                return { err: undefined, val: undefined };
            }
            let totalAmount = BigInt(0);
            try {
                const lines = input
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                const claims: {addr: string, amount: bigint}[] = [];

                for (const line of lines) {
                    const [addr, amountStr] = line.split(',').map(s => s.trim());

                    // Validate address based on network type
                    if (xCnf.linkNetwork === "ethereum") {
                        if (!addr?.match(/^0x[0-9a-fA-F]{40}$/)) {
                            throw new Error(`Invalid Ethereum address: ${addr}`);
                        }
                    } else if (xCnf.linkNetwork === "solana") {
                        if (!addr?.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
                            throw new Error(`Invalid Solana address: ${addr}`);
                        }
                    }

                    // Validate amount
                    if (!amountStr.match(/^\d+$/)) {
                        throw new Error(`Invalid amount: ${amountStr}`);
                    }

                    claims.push({addr, amount: BigInt(amountStr)});
                    totalAmount += BigInt(amountStr);
                }

                return { err: undefined, val: { claims, totalAmount } };
            } catch (e) {
                return {
                    err: e instanceof Error ? e.message : "Invalid input",
                    val: undefined
                };
            }
        },
        deps: [],
    });

    const disableSubmit = isWorking || !currAcct || !!textArea.err;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.adminAddsClaims(
                currAcct.address,
                {
                    type_coin: xCnf.coinType,
                    type_network: getSuiLinkNetworkType(xdropClient.suilinkPkgId, xCnf.linkNetwork),
                    id: xCnf.xdropId,
                },
                textArea.val!.claims.map(c => c.addr),
                textArea.val!.claims.map(c => c.amount),
            );
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
    <div id="page-add-claims" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Add Claims
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Config:</p>
                </div>
                <div className="card-description">
                    <p>Coin Type:<br/>{xCnf.coinType}</p>
                    <p>Network Type:<br/>{ getSuiLinkNetworkType(xdropClient.suilinkPkgId, xCnf.linkNetwork) }</p>
                    <p>xDrop ID:<br/>{xCnf.xdropId}</p>
                    <p>Linked Addresses:<br/>{xCnf.devLinkedAddrs.join(", ")}</p>
                    <p>Claim Amounts:<br/>{xCnf.devClaimAmounts.join(", ")}</p>
                </div>
            </div>

            <div className="card compact">
                <div className="card-description">
                    {textArea.input}
                    {textArea.val && <div>
                        Addresses: {textArea.val.claims.length}<br/>
                        Total amount: {formatBalance(textArea.val.totalAmount, xCnf.coinDecimals, "compact")}
                    </div>}
                </div>
                <div>
                    {currAcct
                        ? <Btn onClick={onSubmit} disabled={disableSubmit}>ADD CLAIMS</Btn>
                        : <BtnConnect />}
                </div>
            </div>

        </div>

    </div>

    </>;
};
