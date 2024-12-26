import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { balanceToString, formatBalance, shortenAddress, TransferModule } from "@polymedia/suitcase-core";
import { LinkToExplorer, useFetch, useTextArea } from "@polymedia/suitcase-react";
import { LinkNetwork, MAX_CLAIMS_ADDED_PER_TX, XDrop, XDropModule } from "@polymedia/xdrop-sdk";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comp/button";
import { CardSpinner, CardWithMsg } from "./comp/cards";
import { ConnectToGetStarted } from "./comp/connect";
import { ResultMsg, SubmitRes } from "./comp/submits";
import { capitalize } from "./lib/misc";
import { PageNotFound } from "./PageNotFound";

export const PageManage: React.FC = () =>
{
    // === state ===

    let { xdropId } = useParams();
    if (!xdropId) { return <PageNotFound />; }

    const { header, xdropClient, isWorking, setIsWorking } = useAppContext();

    const currAcct = useCurrentAccount();

    const fetched = useFetch(
        async () => !currAcct ? undefined : await xdropClient.fetchXDrop(xdropId),
        [xdropId, currAcct?.address]
    );
    const { err, isLoading, refetch, data: xdrop } = fetched;

    // === effects ===

    useEffect(() => {
        console.debug("[PageManage] xdrop:", JSON.stringify(xdrop, null, 2));
    }, [xdrop]);

    // === html ===

    const body: React.ReactNode = (() =>
    {
        if (err) {
            return <CardWithMsg className="compact">
                {err}
            </CardWithMsg>;
        }
        if (!currAcct) {
            return <div className="card compact center-text">
                <ConnectToGetStarted />
            </div>;
        }
        if (isLoading || xdrop === undefined) {
            return <CardSpinner className="compact" />;
        }
        if (xdrop === null) {
            return <CardWithMsg className="compact">
                xDrop not found.
            </CardWithMsg>;
        }

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
                        tx, `0x2::coin::Coin<${xdrop.type_coin}>`, coin, currAcct.address
                    )
                },
                show: xdrop.is_ended && xdrop.balance > 0n,
            },
        ];

        const onSubmitAction = async (action: (tx: Transaction) => TransactionResult) =>
        {
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
                refetch();
            }
        };

        return <>
            <CardDetails xdrop={xdrop} />
            <CardAddClaims xdrop={xdrop} currAddr={currAcct.address} />
            {adminActions.map((action, idx) => (
                <CardAction
                    key={idx}
                    {...action}
                    submit={() => onSubmitAction(action.submit)}
                />
            ))}
        </>;
    })();

    return <>
    {header}
    <div id="page-manage" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Manage xDrop
            </div>

            {body}

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
    currAddr: string;
}> = ({
    xdrop,
    currAddr,
}) =>
{
    if (xdrop.is_ended) return null;

    // === state ===

    const { xdropClient, isWorking, setIsWorking } = useAppContext();
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const coinDecimals = 9; // TODO

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
                    const amount = Math.floor(Math.random() * (100 * 10**coinDecimals)) + 1;
                    return `${addr},${amount}`;
                });
                // const rows = devClaims.map(claim => `${claim.foreignAddr},${claim.amount}`);
                return rows.join('\n');
            })(),
            required: true,
            placeholder: xdrop.network_name === "solana"
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
                    if (xdrop.network_name === "ethereum") {
                        addr = addr.toLowerCase(); // IMPORTANT: SuiLink uses lowercase Ethereum addresses
                        if (!addr?.match(/^0x[0-9a-fA-F]{40}$/)) {
                            throw new Error(`Invalid Ethereum address: ${addr}`);
                        }
                    } else if (xdrop.network_name === "solana") {
                        if (!addr?.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
                            throw new Error(`Invalid Solana address: ${addr}`);
                        }
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
            FOREIGN_ADDRESS is the user's {capitalize(xdrop.network_name)} address.
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
            <p>Amount: {formatBalance(textArea.val.totalAmount, coinDecimals, "compact")} TODO</p>
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

const CardDetails: React.FC<{
    xdrop: XDrop;
}> = ({
    xdrop,
}) => {
    const { explorer, network } = useAppContext();
    const coinDecimals = 9; // TODO
    return (
        <div className="card compact">
            <div className="card-title">Details</div>
            <div className="card-details">
                <Detail label="xDrop ID:" val={<LinkToExplorer addr={xdrop.id} kind="object" explorer={explorer} network={network} />} />
                <Detail label="Network type:" val={shortenAddress(xdrop.type_network)} />
                <Detail label="Coin type:" val={<LinkToExplorer addr={xdrop.type_coin} kind="coin" explorer={explorer} network={network} />} />
                <Detail label="Admin:" val={<LinkToExplorer addr={xdrop.admin} kind="address" explorer={explorer} network={network} />} />
                <Detail label="Status:" val={xdrop.status} />
                <Detail label="Balance:" val={formatBalance(xdrop.balance, coinDecimals, "compact")} />
                <Detail label="Claims length:" val={xdrop.claims_length} />
                <Detail label="Addresses claimed/unclaimed:" val={`${xdrop.stats.addrs_claimed}/${xdrop.stats.addrs_unclaimed}`} />
                <Detail label="Amount claimed/unclaimed:" val={`${formatBalance(xdrop.stats.amount_claimed, coinDecimals, "compact")}/${formatBalance(xdrop.stats.amount_unclaimed, coinDecimals, "compact")}`} />
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
