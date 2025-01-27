import { useCurrentAccount } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";

import { formatBalance, removeAddressLeadingZeros, shortenAddress, stringToBalance, TransferModule } from "@polymedia/suitcase-core";
import { isLocalhost, useInputPrivateKey, useTextArea } from "@polymedia/suitcase-react";
import { calculateFee, FEE, LinkNetwork, MAX_OBJECTS_PER_TX, validateAndNormalizeNetworkAddr, XDrop, XDropModule } from "@polymedia/xdrop-sdk";

import { useAppContext } from "./App";
import { BtnLinkInternal, BtnSubmit } from "./comp/buttons";
import { Card, CardXDropDetails, XDropStats } from "./comp/cards";
import { useXDrop } from "./comp/hooks";
import { XDropLoader } from "./comp/loader";
import { clientWithKeypair, fmtBal, generateRandomEthereumAddress, generateRandomSolanaAddress, shortenString } from "./lib/helpers";
import { devLinkedForeignAddrs } from "./PageDevLink";
import { PageNotFound } from "./PageNotFound";

type AdminActionFn = (tx: Transaction) => TransactionResult;
const BLINK_DURATION_MS = 4000;

export const PageManage: React.FC = () =>
{
    // === state ===

    const { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, isWorking, setIsWorking, xdropClient } = useAppContext();
    const currAcct = useCurrentAccount();
    const fetched = useXDrop(xdropId);
    const disableSubmit = isWorking || !currAcct;

    // === animations ===

    const [statusBlink, setStatusBlink] = useState(false);
    const [statsBlink, setStatsBlink] = useState(false);
    useEffect(() => {
        if (!statusBlink) { return; }
        const timer = setTimeout(() => { setStatusBlink(false); }, BLINK_DURATION_MS);
        return () => clearTimeout(timer);
    }, [statusBlink]);

    useEffect(() => {
        if (!statsBlink) { return; }
        const timer = setTimeout(() => { setStatsBlink(false); }, BLINK_DURATION_MS);
        return () => clearTimeout(timer);
    }, [statsBlink]);

    // === functions ===

    const onSubmitAction = async (
        submit: AdminActionFn,
        blinkStatus: boolean,
    ) => {
        if (disableSubmit) return;
        try {
            setIsWorking(true);
            const tx = new Transaction();
            submit(tx);
            const resp = await xdropClient.signAndExecuteTx(tx);
            console.debug("[onSubmit] okay:", resp);
            toast.success("Success");
            fetched.refetch();
            if (blinkStatus) {
                setStatusBlink(true);
            }
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errToStr(err, "Something went wrong");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

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
                    const admin_opens_xdrop: AdminActionFn = (tx) =>
                        XDropModule.admin_opens_xdrop(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );

                    const admin_pauses_xdrop: AdminActionFn = (tx) =>
                        XDropModule.admin_pauses_xdrop(
                            tx,
                            xdropClient.xdropPkgId,
                            xdrop.type_coin,
                            xdrop.type_network,
                            xdrop.id,
                        );

                    const admin_ends_and_reclaims_xdrop: AdminActionFn = (tx) => {
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

                    const admin_reclaims_balance: AdminActionFn = (tx) => {
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

                    return <>
                        <CardXDropDetails
                            xdrop={xdrop}
                            statusClass={statusBlink ? "blink" : ""}
                            extraDetails={<XDropStats
                                xdrop={xdrop}
                                coinMeta={coinMeta}
                                detailClass={statsBlink ? "blink" : ""}
                            />}
                            button={<BtnLinkInternal to={`/claim/${xdrop.id}`} disabled={isWorking}>
                                VIEW CLAIM PAGE
                            </BtnLinkInternal>}
                         />

                        {currAcct!.address !== xdrop.admin
                        ? <CardNotAdmin xdrop={xdrop} />
                        : (() => {
                            const cardAddClaims =
                                <CardAddClaims
                                    currAddr={currAcct!.address}
                                    xdrop={xdrop}
                                    coinMeta={coinMeta}
                                    onSuccess={() => {
                                        fetched.refetch();
                                        setStatsBlink(true);
                                    }}
                                />;

                            const showAddClaimsFirst = xdrop.claims.length === 0;

                            return <>
                                {showAddClaimsFirst && <>{cardAddClaims}</>}

                                {!xdrop.is_ended && xdrop.is_paused && xdrop.claims.length > 0 &&
                                <CardAdminAction
                                    title="Open claims"
                                    info="Allow users to claim their share of the xDrop."
                                    btnTxt="OPEN CLAIMS"
                                    submit={() => onSubmitAction(admin_opens_xdrop, true)}
                                />}

                                {!xdrop.is_ended && xdrop.is_open && xdrop.claims.length > 0 &&
                                <CardAdminAction
                                    title="Pause claims"
                                    info="Stop users from claiming their share of the xDrop."
                                    btnTxt="PAUSE CLAIMS"
                                    submit={() => onSubmitAction(admin_pauses_xdrop, true)}
                                />}

                                {!xdrop.is_ended && xdrop.claims.length > 0 &&
                                <CardAdminAction
                                    title="End xDrop"
                                    info="End the xDrop permanently and reclaim any remaining balance. This cannot be undone."
                                    btnTxt="END PERMANENTLY"
                                    submit={() => onSubmitAction(admin_ends_and_reclaims_xdrop, true)}
                                    btnClass="red"/>
                                }

                                {xdrop.is_ended && xdrop.balance > 0n &&
                                <CardAdminAction
                                    title="Reclaim Balance"
                                    info="Reclaim the remaining balance of the xDrop."
                                    btnTxt="RECLAIM"
                                    submit={() => onSubmitAction(admin_reclaims_balance, false)}
                                />}

                                {!showAddClaimsFirst && <>{cardAddClaims}</>}
                            </>;
                        })()}
                    </>;
                }}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardAdminAction: React.FC<{
    title: string;
    info: string;
    btnTxt: string;
    submit: () => Promise<void>;
    btnClass?: string;
}> = ({
    title,
    info,
    btnTxt,
    submit,
    btnClass = ""
}) => {
    const { isWorking } = useAppContext();

    return (
        <Card>
            <div className="card-title">
                <p>{title}</p>
            </div>
            <div className="card-desc">
                <p>{info}</p>
            </div>
            <div className="card-desc">
                <BtnSubmit
                    disabled={isWorking}
                    onClick={submit}
                    className={btnClass}
                >
                    {btnTxt}
                </BtnSubmit>
            </div>
        </Card>
    );
};

const CardAddClaims: React.FC<{
    currAddr: string;
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    onSuccess: () => void;
}> = ({
    currAddr,
    xdrop,
    coinMeta,
    onSuccess,
}) =>
{
    if (xdrop.is_ended) return null;

    // === state ===

    const { xdropClient, isWorking, setIsWorking } = useAppContext();
    const [progressUpdates, setProgressUpdates ] = useState<string[]>([]);

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
            value: devClaimsOrEmpty(xdrop.network_name),
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
        html: {
            value: String(import.meta.env.VITE_PRIVATE_KEY ?? ""),
            placeholder: "suiprivkey...",
        },
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
                    if (xdrop.claims.length === 0)
                        return;
                    console.debug("[onSubmit] checking for existing addresses in xdrop");
                    const statuses = await xdropClient.fetchEligibleStatuses({
                        typeCoin: xdrop.type_coin,
                        linkNetwork: xdrop.network_name,
                        xdropId: xdrop.id,
                        addrs: claims.map(c => c.foreignAddr),
                        onUpdate: msg => console.debug("[fetchEligibleStatuses]", msg),
                    });
                    const claimsAndStatus = claims.map((claim, i) => ({ ...claim, status: statuses[i] }));
                    const existingAddrs = claimsAndStatus
                        .filter(c => c.status.eligible)
                            .map(c => shortenString(c.foreignAddr));
                    if (existingAddrs.length > 0) {
                        throw new Error(`Addresses already in xDrop: ${existingAddrs.join(", ")}`);
                    }
                })(),
            ]);

            // submit the tx
            console.debug("[onSubmit] submitting tx");
            const client = !privateKey.val ? xdropClient : clientWithKeypair(xdropClient, privateKey.val);
            const resps = await client.adminAddsClaims({
                sender: currAddr,
                xdrop,
                claims,
                fee: FEE,
                onUpdate: msg => setProgressUpdates(prev => [...prev, msg]),
            });
            console.debug("[onSubmit] okay:", resps);
            toast.success("Success");
            onSuccess();
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to add claims");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
            setProgressUpdates([]);
        }
    };

    // === html ===

    return <Card>
        <div className="card-title">
            <p>Add {xdrop.claims.length > 0 ? "more " : ""}claims</p>
        </div>

        <div className="card-desc">
            <p>
                {xdrop.claims.length === 0
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

        {isWorking && progressUpdates.length > 0 &&
        <div className="card-desc">
            <div className="card-title">Progress:</div>
            <div className="card-desc">
                {progressUpdates.map((msg, idx) =>
                    <React.Fragment key={idx}>{msg}<br /></React.Fragment>)}
            </div>
        </div>}
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

/**
 * Generate development claims data as CSV string for testing purposes.
 */
function devClaimsOrEmpty(network: LinkNetwork): string {
    if (!isLocalhost()) return "";

    const randomAddr = network === "Solana"
        ? generateRandomSolanaAddress
        : generateRandomEthereumAddress;

    const randomAmount = () => Math.floor(Math.random() * 100 + 1);

    return [
        ...devLinkedForeignAddrs[network].map(addr => `${addr},${randomAmount()}`),
        ...Array.from({ length: 1000 }, () => `${randomAddr()},${randomAmount()}`),
    ].join("\n");
}
