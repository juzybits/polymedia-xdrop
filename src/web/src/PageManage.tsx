import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { formatBalance, TransferModule } from "@polymedia/suitcase-core";
import { LinkToExplorer, useTextArea } from "@polymedia/suitcase-react";
import { MAX_CLAIMS_ADDED_PER_TX, XDrop, XDropModule, XDropStatus } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comp/button";
import { useXDrop, XDropLoader } from "./comp/loader";
import { ResultMsg, SubmitRes } from "./comp/submits";
import { PageNotFound } from "./PageNotFound";

export const PageManage: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, isWorking, setIsWorking, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);

    const onSubmitAction = async (action: (tx: Transaction) => TransactionResult) => {
        if (isWorking || !currAcct) return;
        try {
            setIsWorking(true);
            const tx = new Transaction();
            action(tx);
            const resp = await xdropClient.signAndExecuteTx(tx);
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
            fetched.refetch();
        }
    };

    return <>
        {header}
        <div id="page-manage" className="page-regular">
            <div className="page-content">
                <div className="page-title">
                    Manage xDrop
                </div>

                <XDropLoader fetched={fetched}>
                {(xdrop, coinMeta) => {
                    const adminActions = [
                        {
                            title: "Open xDrop",
                            info: "Allow users to claim their share of the xDrop.",
                            btnTxt: "OPEN",
                            submit: (tx: Transaction) => XDropModule.admin_opens_xdrop(
                                tx,
                                xdropClient.xdropPkgId,
                                xdrop.type_coin,
                                xdrop.type_network,
                                xdropId,
                            ),
                            show: !xdrop.is_ended && xdrop.is_paused,
                        },
                        {
                            title: "Pause xDrop",
                            info: "Stop users from claiming their share of the xDrop.",
                            btnTxt: "PAUSE",
                            submit: (tx: Transaction) => XDropModule.admin_pauses_xdrop(
                                tx,
                                xdropClient.xdropPkgId,
                                xdrop.type_coin,
                                xdrop.type_network,
                                xdropId,
                            ),
                            show: !xdrop.is_ended && xdrop.is_open,
                        },
                        {
                            title: "End xDrop",
                            info: "End the xDrop permanently. This cannot be undone.",
                            btnTxt: "END",
                            submit: (tx: Transaction) => XDropModule.admin_ends_xdrop(
                                tx,
                                xdropClient.xdropPkgId,
                                xdrop.type_coin,
                                xdrop.type_network,
                                xdropId,
                            ),
                            show: !xdrop.is_ended,
                        },
                        {
                            title: "Reclaim Balance",
                            info: "Reclaim the remaining balance of the xDrop.",
                            btnTxt: "RECLAIM",
                            submit: (tx: Transaction) => {
                                const [coin] = XDropModule.admin_reclaims_balance(
                                    tx,
                                    xdropClient.xdropPkgId,
                                    xdrop.type_coin,
                                    xdrop.type_network,
                                    xdropId,
                                );
                                return TransferModule.public_transfer(
                                    tx, `0x2::coin::Coin<${xdrop.type_coin}>`, coin, currAcct!.address
                                )
                            },
                            show: xdrop.is_ended && xdrop.balance > 0n,
                        },
                    ];

                    return <>
                        <CardDetails xdrop={xdrop} coinMeta={coinMeta} />
                        <CardAddClaims
                            xdrop={xdrop}
                            coinMeta={coinMeta}
                            currAddr={currAcct!.address}
                        />
                        {adminActions.map((action, idx) => (
                            <CardAction
                                key={idx}
                                {...action}
                                submit={() => onSubmitAction(action.submit)}
                            />
                        ))}
                    </>;
                }}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardAction: React.FC<{
    title: string;
    info: string;
    btnTxt: string;
    submit: () => Promise<void>;
    show: boolean;
    disabled?: boolean;
}> = (a) =>
{
    if (!a.show) return null;

    const { isWorking } = useAppContext();
    const disabled = a.disabled || isWorking;

    return (
        <div className="card compact">
            <div className="card-title">
                <p>{a.title}</p>
            </div>
            <div className="card-description">
                <p>{a.info}</p>
            </div>
            <div className="card-description">
                <Btn onClick={a.submit} disabled={disabled} className={a.btnTxt === "END" ? "red" : ""}>
                    {a.btnTxt}
                </Btn>
            </div>
        </div>
    );
};

const CardAddClaims: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    currAddr: string;
}> = ({
    xdrop,
    coinMeta,
    currAddr,
}) =>
{
    if (xdrop.is_ended) return null;

    // === state ===

    const { xdropClient, isWorking, setIsWorking } = useAppContext();
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const textArea = useTextArea<{
        claims: { foreignAddr: string, amount: bigint }[],
        totalAmount: bigint,
    }>({
        msgRequired: "Claims are required.",
        html: {
            value: (() => {
                const rows = Array.from({ length: 1001 }, () => {
                    // Generate random Ethereum address (40 hex chars)
                    const addr = '0x' + Array.from({ length: 40 }, () =>
                        Math.floor(Math.random() * 16).toString(16)
                    ).join('');
                    // Random amount between 1 and 100
                    const amount = Math.floor(Math.random() * (100 * 10**coinMeta.decimals)) + 1;
                    return `${addr},${amount}`;
                });
                // const rows = devClaims.map(claim => `${claim.foreignAddr},${claim.amount}`);
                return rows.join('\n');
            })(),
            required: true,
            placeholder: xdrop.network_name === "Solana"
                ? "AaAaAa,1000\nBbBbBb,2000"
                : "0xAAAAA,1000\n0xBBBBB,2000",
        },
        validate: (input) => {
            if (!input) {
                return { err: null, val: undefined };
            }
            let totalAmount = BigInt(0);
            try {
                const lines = input
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                const claims: {foreignAddr: string, amount: bigint}[] = [];

                for (const line of lines) {
                    let [addr, amountStr] = line.split(',').map(s => s.trim());

                    // Validate address based on network type
                    if (xdrop.network_name === "Ethereum") {
                        addr = addr.toLowerCase(); // IMPORTANT: SuiLink uses lowercase Ethereum addresses
                        if (!addr?.match(/^0x[0-9a-fA-F]{40}$/)) {
                            throw new Error(`Invalid Ethereum address: ${addr}`);
                        }
                    } else if (xdrop.network_name === "Solana") {
                        if (!addr?.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
                            throw new Error(`Invalid Solana address: ${addr}`);
                        }
                    } else {
                        throw new Error(`Unsupported network: ${xdrop.network_name}`);
                    }

                    // Validate amount
                    if (!amountStr.match(/^\d+$/)) {
                        throw new Error(`Invalid amount: ${amountStr}`);
                    }

                    claims.push({foreignAddr: addr, amount: BigInt(amountStr)});
                    totalAmount += BigInt(amountStr);
                }

                return { err: null, val: { claims, totalAmount } };
            } catch (e) {
                return {
                    err: e instanceof Error ? e.message : "Invalid input",
                    val: undefined
                };
            }
        },
        deps: [],
    });

    const disableSubmit = isWorking || !!textArea.err;

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });
            const resp = await xdropClient.adminAddsClaims(
                currAddr,
                xdrop,
                textArea.val!.claims,
            );
            console.debug("[onSubmit] okay:", resp);
            setSubmitRes({ ok: true });
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            setSubmitRes({ ok: false, err: xdropClient.errParser.errToStr(err, "Failed to add claims") });
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    const requiredTxs = !textArea.val ? 0 : Math.ceil(textArea.val.claims.length / MAX_CLAIMS_ADDED_PER_TX);

    return <>
    <div className="card compact">

        <div className="card-title">
            <p>Add Claims</p>
        </div>

        <div className="card-description">
            <p>Enter 1 claim per line in this format:<br/>FOREIGN_ADDRESS,RAW_AMOUNT
            <br/><br/>
            FOREIGN_ADDRESS is the user's {xdrop.network_name} address.
            <br/><br/>
            RAW_AMOUNT is the amount claimable by the user, in raw units (e.g. 1 SUI = 1000000000).
            </p>
        </div>

        <div className="card-description">
            {textArea.input}
        </div>

        {textArea.val && <>
        <div className="card-description">
        <div className="card-title">Summary:</div>
            <p>Addresses: {textArea.val.claims.length}</p>
            <p>Amount: {formatBalance(textArea.val.totalAmount, coinMeta.decimals, "compact")}</p>
            {requiredTxs > 1 && <p>⚠️ Requires {requiredTxs} transactions</p>}
        </div>
        </>}

        <div className="card-description">
            <Btn onClick={onSubmit} disabled={disableSubmit}>ADD CLAIMS</Btn>
        </div>
        <ResultMsg res={submitRes} />
    </div>
    </>;
};

const StatusLabel: React.FC<{ status: XDropStatus }> = ({ status }) => {
    if (status === "open")   return <label className="text-green">Open</label>;
    if (status === "paused") return <label className="text-orange">Paused</label>;
    if (status === "ended")  return <label className="text-red">Ended</label>;
    throw new Error(`Unknown status: ${status}`);
};

const CardDetails: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
}> = ({
    xdrop,
    coinMeta,
}) => {
    const { explorer, network } = useAppContext();
    return (
        <div className="card compact">
            <div className="card-title">Details</div>
            <div className="card-details">
                <Detail label="xDrop ID:" val={<LinkToExplorer addr={xdrop.id} kind="object" explorer={explorer} network={network} />} />
                <Detail label="Network type:" val={xdrop.network_name} />
                <Detail label="Coin type:" val={<LinkToExplorer addr={xdrop.type_coin} kind="coin" explorer={explorer} network={network} />} />
                <Detail label="Admin:" val={<LinkToExplorer addr={xdrop.admin} kind="address" explorer={explorer} network={network} />} />
                <Detail label="Status:" val={<StatusLabel status={xdrop.status} />} />
                <Detail label="Balance claimed/unclaimed:" val={`${formatBalance(xdrop.stats.amount_claimed, coinMeta.decimals, "compact")} / ${formatBalance(xdrop.stats.amount_unclaimed, coinMeta.decimals, "compact")}`} />
                <Detail label="Addresses claimed/unclaimed:" val={`${xdrop.stats.addrs_claimed} / ${xdrop.stats.addrs_unclaimed}`} />
            </div>
        </div>
    );
};

const Detail: React.FC<{
    label: string;
    val: React.ReactNode;
}> = ({
    label,
    val,
}) => {
    return <div className="detail">
        <span className="label">{label}</span>
        <span className="value">{val}</span>
    </div>;
};
