import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { formatBalance, shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch } from "@polymedia/suitcase-react";
import { LinkNetwork, LinkWithAmount, SuiLink } from "@polymedia/xdrop-sdk";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { PageNotFound } from "./PageNotFound";
import { Btn } from "./comps/button";
import { CardSpinner, CardWithMsg } from "./comps/cards";
import { BtnConnect } from "./comps/connect";
import { XDropConfig } from "./lib/app-config";

export const PageClaim: React.FC = () =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { xdropId } = useParams();
    if (xdropId !== "detf") {
        return <PageNotFound />;
    }

    const { header, appCnf } = useAppContext();
    const xCnf = appCnf[xdropId];
    const linkedNet = capitalize(xCnf.linkNetwork);

    return <>
    {header}
    <div id="page-claim" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Claim Sui {xCnf.coinTicker}
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 1: Link your {linkedNet} address</p>
                </div>
                <div className="card-description">
                    <p>Prove ownership of your {linkedNet} address by linking it to your Sui address.</p>
                </div>
                <div className="card-description">
                    If you hold {xCnf.coinTicker} in multiple wallets, you can link all of them to the same Sui address.
                </div>
                <div className="center-element">
                    <LinkExternal className="btn" href="https://www.suilink.io/">LINK ADDRESS</LinkExternal>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 2: Claim your {xCnf.coinTicker} on Sui</p>
                </div>
                <div className="card-description">
                    Once your {linkedNet} address is linked, you can claim the same amount of Sui {xCnf.coinTicker} as you hold on {linkedNet}.
                </div>
                {!currAcct
                    ? <>
                        <div className="card-description">
                            Connect your Sui wallet to claim.
                        </div>
                        <div className="center-element">
                            <BtnConnect />
                        </div>
                    </>
                : <>
                    <div className="card-description">
                        <p>You are connected as {shortenAddress(currAcct.address)} (<a onClick={() => disconnect()}>disconnect</a>).</p>
                    </div>
                    <ClaimWidget xCnf={xCnf} currAddr={currAcct.address} />
                </>}
            </div>

        </div>

    </div>
    </>;
};

const ClaimWidget: React.FC<{
    xCnf: XDropConfig;
    currAddr: string;
}> = ({
    xCnf,
    currAddr,
}) =>
{
    // == state ==

    const currAcct = useCurrentAccount();

    const { xdropClient, isWorking, setIsWorking } = useAppContext();

    const links = useFetch(
        async () => await xdropClient.fetchOwnedLinks(currAddr, xCnf.linkNetwork),
        [currAddr, xCnf.linkNetwork]
    );

    const amounts = useFetch(
        async () => {
            if (!links.data) { return undefined; }
            return await xdropClient.fetchClaimableAmounts(
                xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId, links.data.map(l => l.network_address)
            );
        },
        [xCnf.coinType, xCnf.linkNetwork, xCnf.xdropId, links.data]
    );

    // == effects ==

    useEffect(() => { // dev only
        if (links.data) {
            console.debug("Owned links:",JSON.stringify(links.data, null, 2));
        }
    }, [links]);

    useEffect(() => { // dev only
        if (amounts.data) {
            console.debug("Claimable amounts:",JSON.stringify(amounts.data, null, 2));
        }
    }, [amounts]);

    // == functions ==

    const onSubmit = async () => {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.userClaims(
                currAddr,
                xCnf.coinType,
                xCnf.linkNetwork,
                xCnf.xdropId,
                mergedData!.filter(l => l.amount !== null && l.amount > 0n).map(l => l.id)
            );
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    if (links.error || amounts.error) {
        return <CardWithMsg className="compact">{links.error ?? amounts.error}</CardWithMsg>;
    } else if (links.isLoading || amounts.isLoading) {
        return <CardSpinner />;
    }

    const disableSubmit = !currAcct || isWorking || !links.data || !amounts.data /*|| !isOpen*/;
    const hasAnyLinks = links.data && links.data.length > 0;
    const hasEligibleLinks = amounts.data && amounts.data.some(a => a !== null);

    const mergedData: LinkWithAmount[] | undefined =
        !(links.data && amounts.data)
        ? undefined
        : links.data.map((link, i) => ({ // merge links and amounts
            ...link,
            amount: amounts.data![i]
        })).sort((a, b) => { // put positive amounts first, and 0/null amounts last
            const aPositive = a.amount !== null && a.amount > 0n;
            const bPositive = b.amount !== null && b.amount > 0n;
            if (aPositive === bPositive) return 0; // keep original order
            return aPositive ? -1 : 1;
        });

    return <>
        <div className="card-title">Claimable amounts</div>

        {(() => {
            if (!hasAnyLinks) {
                return <div className="card-description">
                    You haven't linked any addresses yet.
                </div>;
            }
            if (!hasEligibleLinks) {
                return <div className="card-description">
                    None of your linked addresses are eligible.
                </div>;
            }
            return <>
                <div className="card-description">
                    <div className="card-list tx-list">
                        {mergedData!.map((linkWithAmount) =>
                            linkWithAmount.amount === null ? null : (
                                <CardClaimableItem
                                    key={linkWithAmount.id}
                                    xCnf={xCnf}
                                    link={linkWithAmount}
                                    amount={linkWithAmount.amount}
                                />
                            )
                        )}
                    </div>
                </div>

                <div className="center-element">
                    <Btn onClick={onSubmit}>CLAIM ALL</Btn>
                </div>
            </>;
        })()}
    </>;
};

const CardClaimableItem: React.FC<{
    xCnf: XDropConfig;
    link: SuiLink;
    amount: bigint;
}> = ({
    xCnf,
    link,
    amount,
}) => {
    const linkedNet = capitalize(xCnf.linkNetwork);
    const isClaimed = amount === 0n;
    return <div className={`card compact ${isClaimed ? "disabled" : ""}`}>
        <div className="card-header">
            <div className="card-title">
                {isClaimed
                    ? "Already claimed"
                    : formatBalance(amount, xCnf.coinDecimals) + " " + xCnf.coinTicker}
            </div>
        </div>
        <div className="card-body">
            <div>
                {linkedNet} address: <LinkExternal href={linkedAddrUrl(xCnf.linkNetwork, link.network_address)}>
                    {shortenLinkedAddr(link.network_address)}
                </LinkExternal>
            </div>
        </div>
    </div>;
};

// === helpers ===

function shortenLinkedAddr(addr: string): string {
    return addr.slice(0, addr.startsWith("0x") ? 6 : 4)
        + "…" + addr.slice(-4);
}

function linkedAddrUrl(network: LinkNetwork, addr: string): string {
    return `https://${network === "ethereum" ? "etherscan" : "solscan"}.io/address/${addr}`;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
