import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { formatBalance, shortenAddress, TransferModule } from "@polymedia/suitcase-core";
import { Btn, LinkToExplorer, useTextArea } from "@polymedia/suitcase-react";
import { MAX_CLAIMS_ADDED_PER_TX, XDrop, XDropModule, XDropStatus } from "@polymedia/xdrop-sdk";
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { CardXDropDetails, XDropDetail, XDropStatusLabel } from "./comp/cards";
import { useXDrop, XDropLoader } from "./comp/loader";
import { ResultMsg, SubmitRes } from "./comp/submits";
import { PageNotFound } from "./PageNotFound";

type AdminAction = (tx: Transaction) => TransactionResult;

export const PageManage: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, isWorking, setIsWorking, explorer, network, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);

    const [reclaimOnEnd, setReclaimOnEnd] = useState(true);

    const onSubmitAction = async (action: AdminAction) => {
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

                <XDropLoader fetched={fetched} requireWallet={true}>
                {(xdrop, coinMeta) =>
                {
                    const admin_opens_xdrop: AdminAction = (tx) =>
                        XDropModule.admin_opens_xdrop(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );

                    const admin_pauses_xdrop: AdminAction = (tx) =>
                        XDropModule.admin_pauses_xdrop(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );

                    const admin_ends_xdrop: AdminAction = (tx) => {
                        const result = XDropModule.admin_ends_xdrop(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );
                        return reclaimOnEnd ? admin_reclaims_balance(tx) : result;
                    };

                    const admin_reclaims_balance: AdminAction = (tx) => {
                        const [coin] = XDropModule.admin_reclaims_balance(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );
                        return TransferModule.public_transfer(
                            tx, `0x2::coin::Coin<${xdrop.type_coin}>`, coin, currAcct!.address
                        );
                    };

                    const adminActions = [
                        {
                            title: "Open xDrop",
                            info: "Allow users to claim their share of the xDrop.",
                            btnTxt: "OPEN",
                            submit: admin_opens_xdrop,
                            show: !xdrop.is_ended && xdrop.is_paused,
                        },
                        {
                            title: "Pause xDrop",
                            info: "Stop users from claiming their share of the xDrop.",
                            btnTxt: "PAUSE",
                            submit: admin_pauses_xdrop,
                            show: !xdrop.is_ended && xdrop.is_open,
                        },
                        {
                            title: "End xDrop",
                            info: "End the xDrop permanently. This cannot be undone.",
                            btnTxt: "END",
                            submit: admin_ends_xdrop,
                            show: !xdrop.is_ended,
                            extra: <label>
                                <input
                                    type="checkbox"
                                    checked={reclaimOnEnd}
                                    onChange={(e) => setReclaimOnEnd(e.target.checked)}
                                /> Also reclaim any remaining balance
                            </label>,
                        },
                        {
                            title: "Reclaim Balance",
                            info: "Reclaim the remaining balance of the xDrop.",
                            btnTxt: "RECLAIM",
                            submit: admin_reclaims_balance,
                            show: xdrop.is_ended && xdrop.balance > 0n,
                        },
                    ];

                    return <>
                        <CardXDropDetails xdrop={xdrop}
                            title="xDrop Details"
                            extraDetails={<>
                                <XDropDetail label="Balance claimed/unclaimed:" val={`${formatBalance(xdrop.stats.amount_claimed, coinMeta.decimals, "compact")} / ${formatBalance(xdrop.stats.amount_unclaimed, coinMeta.decimals, "compact")}`} />
                                <XDropDetail label="Addresses claimed/unclaimed:" val={`${xdrop.stats.addrs_claimed} / ${xdrop.stats.addrs_unclaimed}`} />
                                {/* <XDropDetail label="Admin:" val={<LinkToExplorer addr={xdrop.admin} kind="address" explorer={explorer} network={network} />} /> */}
                            </>}
                            button={<Link to={`/claim/${xdrop.id}`} className="btn">VIEW CLAIM PAGE</Link>}
                         />

                        {currAcct!.address !== xdrop.admin
                        ? <CardNotAdmin xdrop={xdrop} />
                        : <>
                            <CardAddClaims
                                xdrop={xdrop}
                                coinMeta={coinMeta}
                                refetch={fetched.refetch}
                                currAddr={currAcct!.address}
                                />
                            {adminActions.map((action, idx) => (
                                <CardAction
                                key={idx}
                                {...action}
                                submit={() => onSubmitAction(action.submit)}
                                />
                            ))}
                        </>}
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
    extra?: React.ReactNode;
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
            {a.extra}
            <div className="card-description">
                <Btn disabled={disabled} working={isWorking} onClick={a.submit}
                    className={a.btnTxt === "END" ? "red" : ""}
                >
                    {a.btnTxt}
                </Btn>
            </div>
        </div>
    );
};

const CardAddClaims: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    refetch: () => Promise<void>;
    currAddr: string;
}> = ({
    xdrop,
    coinMeta,
    refetch,
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
            refetch();
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
            <Btn disabled={disableSubmit} working={isWorking} onClick={onSubmit}>ADD CLAIMS</Btn>
        </div>
        <ResultMsg res={submitRes} />
    </div>
    </>;
};

const CardNotAdmin: React.FC<{
    xdrop: XDrop;
}> = ({
    xdrop,
}) => {
    return <div className="card compact">
        <div className="card-title">Not admin</div>
        <div className="card-description">You are not the admin of this xDrop.
            Log in as {shortenAddress(xdrop.admin)} to manage this xDrop.</div>
    </div>;
};
