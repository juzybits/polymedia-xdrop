import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { formatBalance, formatNumber, TransferModule } from "@polymedia/suitcase-core";
import { useFetch, useTextArea } from "@polymedia/suitcase-react";
import { LinkNetwork, MAX_CLAIMS_ADDED_PER_TX, XDrop, XDropModule } from "@polymedia/xdrop-sdk";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { CardSpinner, CardWithMsg } from "./comps/cards";
import { ConnectToGetStarted } from "./comps/connect";
import { capitalize } from "./lib/misc";
import { PageNotFound } from "./PageNotFound";
import { ResultMsg, SubmitRes } from "./comps/submits";

export const PageManage: React.FC = () =>
{
    // === state ===

    let { xdropId } = useParams();
    if (!xdropId) { return <PageNotFound />; }

    const { header, appCnf, xdropClient, isWorking, setIsWorking } = useAppContext();

    if (xdropId === "detf") {
        xdropId = appCnf["detf"].xdropId;
    }

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
            <ActionAddClaims xdrop={xdrop} currAddr={currAcct.address} />
            {adminActions.map((action, idx) => (
                <AdminAction
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

const AdminAction: React.FC<{
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

const ActionAddClaims: React.FC<{
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

    let networkName: LinkNetwork;
    if (xdrop.type_network.endsWith("::Ethereum")) {
        networkName = "ethereum";
    } else if (xdrop.type_network.endsWith("::Solana")) {
        networkName = "solana";
    } else {
        throw new Error("Unsupported network");
    }

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
            placeholder: networkName === "solana"
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
                    if (networkName === "ethereum") {
                        addr = addr.toLowerCase(); // IMPORTANT: SuiLink uses lowercase Ethereum addresses
                        if (!addr?.match(/^0x[0-9a-fA-F]{40}$/)) {
                            throw new Error(`Invalid Ethereum address: ${addr}`);
                        }
                    } else if (networkName === "solana") {
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
            FOREIGN_ADDRESS is the user's {capitalize(networkName)} address.
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
