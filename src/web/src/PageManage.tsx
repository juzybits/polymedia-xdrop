import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { formatBalance, TransferModule } from "@polymedia/suitcase-core";
import { useFetch, useTextArea } from "@polymedia/suitcase-react";
import { XDrop, XDropModule } from "@polymedia/xdrop-sdk";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { Btn } from "./comps/button";
import { CardSpinner, CardWithMsg } from "./comps/cards";
import { ConnectToGetStarted } from "./comps/connect";
import { PageNotFound } from "./PageNotFound";

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
    const { error, isLoading, refetch, data: xdrop } = fetched;

    // === effects ===

    useEffect(() => {
        console.debug("[PageManage] xdrop:", JSON.stringify(xdrop, null, 2));
    }, [xdrop]);

    // === html ===

    const body: React.ReactNode = (() =>
    {
        if (error) {
            return <CardWithMsg className="compact">
                {error}
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
                show: xdrop.is_ended,
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
    // === state ===

    const { xdropClient, isWorking, setIsWorking } = useAppContext();

    const coinDecimals = 9; // TODO

    const textArea = useTextArea<{
        claims: { foreignAddr: string, amount: bigint }[],
        totalAmount: bigint,
    }>({
        msgRequired: "Claims are required.",
        html: {
            value: (() => {
                const rows = Array.from({ length: 2500 }, () => {
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
            placeholder: "0x1234...5678,1000\n0x8765...4321,2000",
        },
        validate: async (input) => {
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
                    if (xdrop.type_network.endsWith("::Ethereum")) {
                        addr = addr.toLowerCase(); // IMPORTANT: SuiLink uses lowercase Ethereum addresses
                        if (!addr?.match(/^0x[0-9a-fA-F]{40}$/)) {
                            throw new Error(`Invalid Ethereum address: ${addr}`);
                        }
                    } else if (xdrop.type_network.endsWith("::Solana")) {
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
            const resp = await xdropClient.adminAddsClaims(
                currAddr,
                xdrop,
                textArea.val!.claims,
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
    <div className="card compact">
        <div className="card-title">
            <p>Add Claims</p>
        </div>
        <div className="card-description">
            <p>Enter 1 claim per line in this format:<br/>FOREIGN_ADDRESS,RAW_AMOUNT
            <br/><br/>
            FOREIGN_ADDRESS is the user's {xdrop.type_network.split("::")[2]} address.
            <br/><br/>
            RAW_AMOUNT is the amount claimable by the user, in raw units (e.g. 1 SUI = 1000000000).
            </p>
        </div>
        <div className="card-description">
            {textArea.input}
            {textArea.val && <div>
                Addresses: {textArea.val.claims.length}<br/>
                Total amount: {formatBalance(textArea.val.totalAmount, coinDecimals, "compact")}
            </div>}
        </div>
        <div>
            <Btn onClick={onSubmit} disabled={disableSubmit}>ADD CLAIMS</Btn>
        </div>
    </div>
    </>;
};
