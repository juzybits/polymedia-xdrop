import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { formatBalance, removeAddressLeadingZeros, shortenAddress, stringToBalance, TransferModule } from "@polymedia/suitcase-core";
import { isLocalhost, useInputPrivateKey, useTextArea } from "@polymedia/suitcase-react";
import { calculateFee, FEE, MAX_OBJECTS_PER_TX, validateAndNormalizeNetworkAddr, XDrop, XDropModule } from "@polymedia/xdrop-sdk";
import React from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { BtnLinkInternal, BtnSubmit } from "./comp/buttons";
import { Card, CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { XDropLoader } from "./comp/loader";
import { clientWithKeypair, fmtBal } from "./lib/helpers";
import { PageNotFound } from "./PageNotFound";

type AdminAction = (tx: Transaction) => TransactionResult;

export const PageManage: React.FC = () =>
{
    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, isWorking, setIsWorking, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);

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
            const msg = xdropClient.errToStr(err, "Something went wrong");
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
                            title: "Open claims",
                            info: "Allow users to claim their share of the xDrop.",
                            btnTxt: "OPEN CLAIMS",
                            submit: admin_opens_xdrop,
                            show: !xdrop.is_ended && xdrop.is_paused,
                        },
                        {
                            title: "Pause claims",
                            info: "Stop users from claiming their share of the xDrop.",
                            btnTxt: "PAUSE CLAIMS",
                            submit: admin_pauses_xdrop,
                            show: !xdrop.is_ended && xdrop.is_open,
                        },
                        {
                            title: "End xDrop",
                            info: "End the xDrop permanently and reclaim any remaining balance. This cannot be undone.",
                            btnTxt: "END PERMANENTLY",
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
                            extraDetails={<XDropStats xdrop={xdrop} coinMeta={coinMeta} />}
                            button={<BtnLinkInternal to={`/claim/${xdrop.id}`} disabled={isWorking}>
                                VIEW CLAIM PAGE
                            </BtnLinkInternal>}
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
                <BtnSubmit disabled={disableBtn} onClick={a.submit}
                    className={a.btnTxt === "END PERMANENTLY" ? "red" : ""}
                >{a.btnTxt}</BtnSubmit>
            </div>
        </Card>
    );
};

const CardAddClaims: React.FC<{ // TODO progress messages for multiple txs
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
        coinTotal: bigint;
        coinFee: bigint;
        coinTotalAndFee: bigint;
    }>({
        msgRequired: "",
        html: {
            value: devClaimsOrEmpty(),
            required: true,
            placeholder: xdrop.network_name === "Solana"
                ? "AaAaAa,1000\nBbBbBb,2000"
                : "0xAAAAA,1000\n0xBBBBB,2000",
        },
        validateInput: (input) => {
            if (!input) {
                return { err: null, val: undefined };
            }
            let coinTotal = BigInt(0);
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
                        coinTotal += amount;
                    } catch (e) {
                        throw new Error(`Invalid amount: ${amountStr}`);
                    }
                }

                const coinFee = calculateFee(claims, FEE.bps);
                const coinTotalAndFee = coinTotal + coinFee;
                return { err: null, val: {
                    claims, coinTotal, coinFee, coinTotalAndFee
                }};
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
        html: { placeholder: "suiprivkey..." },
        validateValue: (pk) => {
            if (pk.toSuiAddress() !== xdrop.admin) {
                return { err: "Admin private key does not match XDrop admin.", val: undefined };
            }
            return { err: null, val: pk };
        },
    });

    const disableSubmit = isWorking || textArea.err !== null || privateKey.err !== null;
    const requiredTxs = !textArea.val ? 0 : Math.ceil(textArea.val.claims.length / MAX_OBJECTS_PER_TX);
    const isSuiXDrop = "0x2::sui::SUI" === removeAddressLeadingZeros(xdrop.type_coin);

    // === functions ===

    const onSubmit = async () =>
    {
        if (disableSubmit) { return; }
        if (!textArea.val) { throw new Error("input has no value (please report this bug)"); }

        try {
            setIsWorking(true);
            const { claims, coinTotalAndFee } = textArea.val;

            // last moment validation against onchain state
            await Promise.all(
            [
                (async () => {
                    /*
                    - non sui xdrop:
                        - check coin_type balance >= coinTotalAndFee
                        - check sui balance >= all tx gas
                    - sui xdrop:
                        - check sui balance >= coinTotalAndFee + all tx gas
                    */
                    const firstTxClaims = claims.slice(0, MAX_OBJECTS_PER_TX);
                    const [coinBal, suiBal, gasTotal] = await Promise.all(
                    [
                        isSuiXDrop ? 0n : xdropClient.suiClient
                            .getBalance({ owner: currAddr, coinType: xdrop.type_coin })
                                .then(resp => BigInt(resp.totalBalance)),

                        xdropClient.suiClient
                            .getBalance({ owner: currAddr })
                                .then(resp => BigInt(resp.totalBalance)),

                        xdropClient.adminAddsClaims({
                            sender: currAddr, xdrop, claims: firstTxClaims, dryRun: true, fee: FEE
                        }).then(respsInspect => {
                            const gas = respsInspect[0].effects!.gasUsed;
                            const gasPerTx = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
                            const gasTotal = (gasPerTx * BigInt(claims.length)) / BigInt(firstTxClaims.length);
                            return gasTotal;
                        }),
                    ]);

                    const summary = !isSuiXDrop ?
                        { has: { coinBal, suiBal }, needs: { coinTotalAndFee, gasTotal } }
                        : { has: suiBal, needs: coinTotalAndFee + gasTotal };
                    console.debug("[onSubmit] balances:", JSON.stringify(summary, null, 2));

                    function errLowBalance(reason: string, owned: bigint, needed: bigint, symbol: string) {
                        throw new Error(`Insufficient balance to ${reason}: `
                            + `you need ${fmtBal(needed, decimals, symbol)}, `
                            + `but only have ${fmtBal(owned, decimals, symbol)}`);
                    }

                    if (!isSuiXDrop) {
                        if (coinBal < coinTotalAndFee) {
                            errLowBalance("fund the claims", coinBal, coinTotalAndFee, symbol);
                        }
                        if (suiBal < gasTotal) {
                            errLowBalance("pay for transaction fees", suiBal, gasTotal, "SUI");
                        }
                    } else {
                        if (suiBal < (coinTotalAndFee + gasTotal)) {
                            errLowBalance("fund the claims and pay for gas",
                                suiBal, gasTotal + coinTotalAndFee, "SUI");
                        }
                    }
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
                })(),
            ]);

            // submit the tx
            console.debug("[onSubmit] submitting tx");
            const client = clientWithKeypair(xdropClient, privateKey.val);
            const resps = await client.adminAddsClaims({
                sender: currAddr, xdrop, claims, fee: FEE
            });
            console.debug("[onSubmit] okay:", resps);
            toast.success("Success");
            refetch();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to add claims");
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
                {xdrop.claims.size === 0
                    ? <>Configure who can claim {symbol}. </>
                    : <>You can add more eligible addresses. </>
                }
                Once you're happy with the list, you can open claims below.
            </p>
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
                    👥 {textArea.val.claims.length} address{textArea.val.claims.length === 1 ? "" : "es"}
                    <br />💰 {formatBalance(textArea.val.coinTotal, decimals, "compact")} claimable {symbol}
                    <br />{ FEE.bps > 0n
                        ? <>💸 {Number(FEE.bps) / 100}% fee: {fmtBal(textArea.val.coinFee, decimals, symbol)}</>
                        : <>❤️ no platform fees</>}
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

        <BtnSubmit disabled={disableSubmit} onClick={onSubmit}>ADD CLAIMS</BtnSubmit>
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

function devClaimsOrEmpty()
{
    if (!isLocalhost()) return "";
    return (
// `0x0000000000000000000000000000000000000AaA,100
// 0x1111111111111111111111111111111111111BbB,200
// ` +
Array.from({ length: 1000 }, () => {
        // Generate random Ethereum address (40 hex chars)
        const addr = "0x" + Array.from({ length: 40 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join("");
        // Random amount between 1 and 100
        const amount = Math.random() * 100 + 1;
        return `${addr},${amount}`;
    }).join("\n"));
}
