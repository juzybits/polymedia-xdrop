import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { removeAddressLeadingZeros, shortenAddress, stringToBalance, TransferModule } from "@polymedia/suitcase-core";
import { Btn, isLocalhost, useInputPrivateKey, useTextArea } from "@polymedia/suitcase-react";
import { MAX_OBJECTS_PER_TX, validateAndNormalizeNetworkAddr, XDrop, XDropModule } from "@polymedia/xdrop-sdk";
import React, { useEffect } from "react";
import { toast } from 'react-hot-toast';
import { Link, useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Card, CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { XDropLoader } from "./comp/loader";
import { clientWithKeypair, fmtBal } from "./lib/helpers";
import { PageNotFound } from "./PageNotFound";

type AdminAction = (tx: Transaction) => TransactionResult;

// TODO: maybe add fee
export const PageManage: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, isWorking, setIsWorking, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);

    useEffect(() => {
        if (!fetched.data?.xdrop) return;
        console.debug("[useEffect] xdrop:", JSON.stringify(fetched.data.xdrop, null, 2));
    }, [fetched.data?.xdrop]);

    const disableSubmit = isWorking || !currAcct;
    const onSubmitAction = async (action: AdminAction) => {
        if (disableSubmit) return;
        try {
            setIsWorking(true);
            const tx = new Transaction();
            action(tx);
            const resp = await xdropClient.signAndExecuteTx(tx);
            console.debug("[onSubmit] okay:", resp);
            toast.success("Success");
            fetched.refetch();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errParser.errToStr(err, "Something went wrong");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
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

                    const admin_ends_and_reclaims_xdrop: AdminAction = (tx) => {
                        const result = XDropModule.admin_ends_xdrop(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );
                        return admin_reclaims_balance(tx);
                    };

                    // const admin_sets_admin_address: AdminAction = (tx) => // TODO

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
                            info: "End the xDrop permanently and reclaim any remaining balance. This cannot be undone.",
                            btnTxt: "END",
                            submit: admin_ends_and_reclaims_xdrop,
                            show: !xdrop.is_ended,
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
                            extraDetails={<XDropStats xdrop={xdrop} coinMeta={coinMeta} />}
                            button={<Link to={`/claim/${xdrop.id}`} className="btn">VIEW CLAIM PAGE</Link>}
                         />

                        {currAcct!.address !== xdrop.admin
                        ? <CardNotAdmin xdrop={xdrop} />
                        : <>
                            <CardAddClaims
                                currAddr={currAcct!.address}
                                xdrop={xdrop}
                                coinMeta={coinMeta}
                                refetch={fetched.refetch}
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
}> = (a) =>
{
    if (!a.show) return null;

    const { isWorking } = useAppContext();
    const disableBtn = isWorking || a.disabled;

    return (
        <Card>
            <div className="card-title">
                <p>{a.title}</p>
            </div>
            <div className="card-desc">
                <p>{a.info}</p>
            </div>
            <div className="card-desc">
                <Btn disabled={disableBtn} onClick={a.submit}
                    className={a.btnTxt === "END" ? "red" : ""}
                >
                    {a.btnTxt}
                </Btn>
            </div>
        </Card>
    );
};

const CardAddClaims: React.FC<{
    currAddr: string;
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    refetch: () => Promise<void>;
}> = ({
    currAddr,
    xdrop,
    coinMeta,
    refetch,
}) =>
{
    if (xdrop.is_ended) return null;

    // === state ===

    const { xdropClient, isWorking, setIsWorking } = useAppContext();

    const decimals = coinMeta.decimals;
    const symbol = coinMeta.symbol;

    const textArea = useTextArea<{
        claims: { foreignAddr: string; amount: bigint }[];
        totalAmount: bigint;
    }>({
        msgRequired: "Claims are required.",
        html: {
            value: localhostClaimsOrEmpty(),
            required: true,
            placeholder: xdrop.network_name === "Solana"
                ? "AaAaAa,1000\nBbBbBb,2000"
                : "0xAAAAA,1000\n0xBBBBB,2000",
        },
        validateInput: (input) => {
            if (!input) {
                return { err: null, val: undefined };
            }
            let totalAmount = BigInt(0);
            try {
                const lines = input
                    .split("\n")
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                const claims: {foreignAddr: string; amount: bigint}[] = [];
                const seenAddrs = new Set<string>();

                for (const line of lines) {
                    let [addr, amountStr] = line.split(/[,\t]/).map(s => s.trim()); // eslint-disable-line

                    try {
                        addr = validateAndNormalizeNetworkAddr(xdrop.network_name, addr);
                        if (seenAddrs.has(addr)) {
                            throw new Error(`Duplicate address: ${addr}`);
                        }
                        seenAddrs.add(addr);
                    } catch (e) {
                        throw e instanceof Error ? e : new Error(`Invalid address: ${addr}`);
                    }

                    try {
                        const amount = stringToBalance(amountStr, decimals);
                        if (amount <= 0n) {
                            throw new Error(`Amount must be greater than 0: ${amountStr}`);
                        }
                        claims.push({foreignAddr: addr, amount});
                        totalAmount += amount;
                    } catch (e) {
                        throw new Error(`Invalid amount: ${amountStr}`);
                    }
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

    const privateKey = useInputPrivateKey({
        label: "Admin private key (optional, DYOR 🚨):",
        html: {
            value: import.meta.env.VITE_PRIVATE_KEY ?? "",
            placeholder: "suiprivkey..."
        },
        validateValue: (pk) => {
            if (pk.toSuiAddress() !== xdrop.admin) {
                return { err: "Admin private key does not match XDrop admin.", val: undefined };
            }
            return { err: null, val: pk };
        },
    });

    const disableSubmit = isWorking || !!textArea.err || !!privateKey.err;
    const requiredTxs = !textArea.val ? 0 : Math.ceil(textArea.val.claims.length / MAX_OBJECTS_PER_TX);
    const isSuiXDrop = "0x2::sui::SUI" === removeAddressLeadingZeros(xdrop.type_coin);

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }
        if (!textArea.val) { throw new Error("input has no value (please report this bug)"); }

        try {
            setIsWorking(true);

            const { claims, totalAmount } = textArea.val;

            // last moment validation against onchain state
            await Promise.all([
                // check wallet has enough `type_coin` to fund the claims
                (async () => {
                    if (isSuiXDrop) // checked along with gas below
                        return;
                    const respBalance = await xdropClient.suiClient.getBalance({
                        owner: currAddr, coinType: xdrop.type_coin,
                    });
                    const balance = BigInt(respBalance.totalBalance);
                    if (balance <= totalAmount) {
                        throw new Error("Insufficient balance to fund the claims: "
                            + `you need ${fmtBal(totalAmount, decimals, symbol)}, `
                            + `but only have ${fmtBal(balance, decimals, symbol)}`);
                    }
                    console.debug(`[onSubmit] ${symbol} balance is enough: ${totalAmount} <= ${balance}`);
                })(),
                // check wallet has enough SUI for tx fees (+ totalAmount if isSuiXDrop)
                (async () => {
                    if (!isSuiXDrop && requiredTxs <= 1)
                        return;

                    const firstTxClaims = claims.slice(0, MAX_OBJECTS_PER_TX);
                    const [respBalance, respsInspect] = await Promise.all([
                        xdropClient.suiClient.getBalance({ owner: currAddr }),
                        xdropClient.adminAddsClaims(currAddr, xdrop, firstTxClaims, true)
                    ]);

                    const suiBalance = BigInt(respBalance.totalBalance);
                    const gas = respsInspect[0].effects!.gasUsed;
                    const feePerTx = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
                    const feeTotal = (feePerTx * BigInt(claims.length)) / BigInt(MAX_OBJECTS_PER_TX);
                    const suiTotal = isSuiXDrop ? feeTotal + totalAmount : feeTotal;
                    const totalWithMargin = suiTotal + 100_000_000n; // add 0.1 SUI for safety margin

                    if (suiBalance < totalWithMargin) {
                        throw new Error(`Insufficient balance `
                            + `${isSuiXDrop? "to fund the claims and pay " : ""}for transaction fees: `
                            + `you need ${fmtBal(totalWithMargin, 9, "SUI")}, `
                            + `but only have ${fmtBal(suiBalance, 9, "SUI")}`);
                    }
                    console.debug(`[onSubmit] SUI balance is enough: ${suiTotal} < ${suiBalance}`);
                })(),
                // check for addresses already in xdrop
                (async () => {
                    if (xdrop.claims.size === 0)
                        return;
                    console.debug("[onSubmit] checking for existing addresses in xdrop");
                    const statuses = await xdropClient.fetchEligibleStatuses(
                        xdrop.type_coin,
                        xdrop.network_name,
                        xdrop.id,
                        claims.map(c => c.foreignAddr),
                    );
                    const claimsAndStatus = claims.map((claim, i) => ({ ...claim, status: statuses[i] }));
                    const existingAddrs = claimsAndStatus.filter(c => c.status.eligible).map(c => c.foreignAddr);
                    if (existingAddrs.length > 0) {
                        throw new Error(`Addresses already in xDrop: ${existingAddrs.join(", ")}`);
                    }
                })()
            ]);

            // throw new Error("Dev exit.");

            // submit the tx
            console.debug("[onSubmit] submitting tx");
            const client = clientWithKeypair(xdropClient, privateKey.val);
            const resps = await client.adminAddsClaims(currAddr, xdrop, claims);
            console.debug("[onSubmit] okay:", resps);
            toast.success("Success");
            refetch();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errParser.errToStr(err, "Failed to add claims");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    return <Card>
        <div className="card-title">
            <p>Add Claims</p>
        </div>

        <div className="card-desc">
            <p>
                Enter 1 claim per line as follows:
                <br />{xdrop.network_name.toUpperCase()}_ADDRESS,{symbol}_AMOUNT
            </p>
        </div>

        <div className="card-desc">
            {textArea.input}
        </div>

        {textArea.val && <>
            <div className="card-desc">
                <div className="card-title">Summary</div>
                <div className="card-desc">
                    ▸ {textArea.val.claims.length} addresses
                    <br />▸ {fmtBal(textArea.val.totalAmount, decimals, symbol)}
                </div>
            </div>
            {requiredTxs > 1 && <>
                <div className="card-title">
                    ⚠️ Needs {requiredTxs} transactions
                </div>
                <div className="card-desc">
                    <p>If you don't want to manually approve each tx, you can enter your private key below.</p>
                    <p>Your PK will never leave your browser and is secured by Trust Me Bro™ technology.</p>
                </div>
                <div className="card-desc">
                    {privateKey.input}
                </div>
            </>}
        </>}

        <div className="card-desc">
            <Btn disabled={disableSubmit} onClick={onSubmit}>ADD CLAIMS</Btn>
        </div>
    </Card>;
};

const CardNotAdmin: React.FC<{
    xdrop: XDrop;
}> = ({
    xdrop,
}) => {
    return <Card>
        <div className="card-title">Not admin</div>
        <div className="card-desc">You are not the admin of this xDrop.
            Log in as {shortenAddress(xdrop.admin)} to manage this xDrop.</div>
    </Card>;
};

function localhostClaimsOrEmpty()
{
    if (!isLocalhost()) return "";
    return (
// `0x0000000000000000000000000000000000000AaA,100
// 0x1111111111111111111111111111111111111BbB,200
// ` +
Array.from({ length: 2002 }, () => {
        // Generate random Ethereum address (40 hex chars)
        const addr = "0x" + Array.from({ length: 40 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join("");
        // Random amount between 1 and 100
        const amount = Math.random() * 100 + 1;
        return `${addr},${amount}`;
    }).join("\n"));
}
