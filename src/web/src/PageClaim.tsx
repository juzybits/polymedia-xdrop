import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { formatBalance, shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch } from "@polymedia/suitcase-react";
import { LinkNetwork, LinkWithStatus } from "@polymedia/xdrop-sdk";
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

    const statuses = useFetch(
        async () => {
            if (!links.data) { return undefined; }
            return await xdropClient.fetchClaimStatuses(
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
        if (statuses.data) {
            console.debug("Claimable amounts:",JSON.stringify(statuses.data, null, 2));
        }
    }, [statuses]);

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
                eligibleLinksWithStat!.filter(l => !l.status.claimed).map(l => l.id)
            );
            console.debug("[onSubmit] okay:", resp);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
        } finally {
            setIsWorking(false);
        }
    };

    // === html ===

    if (links.error || statuses.error) {
        return <CardWithMsg className="compact">{links.error ?? statuses.error}</CardWithMsg>;
    } else if (links.isLoading || statuses.isLoading) {
        return <CardSpinner />;
    }

    const disableSubmit = !currAcct || isWorking || !links.data || !statuses.data /*|| !isOpen*/;
    const hasAnyLinks = links.data && links.data.length > 0;
    const hasEligibleLinks = statuses.data && statuses.data.some(s => s.eligible);

    const eligibleLinksWithStat: LinkWithStatus[] | undefined =
        !(links.data && statuses.data)
        ? undefined
        // merge links with their statuses (guaranteed to be in the same order)
        : links.data.map((link, i) => ({
            ...link,
            status: statuses.data![i]
        }))
        // grab only eligible links
        .filter(l => l.status.eligible)
        // put unclaimed links first
        .sort((a, b) => {
            return Number(!b.status.claimed) - Number(!a.status.claimed);
        });

    return <>
        <div className="card-description">
            <div className="card-list tx-list">
                {(() => {
                    if (!hasAnyLinks) {
                        return <div className="card tx disabled">
                            You haven't linked any addresses yet.
                        </div>;
                    }
                    if (!hasEligibleLinks) {
                        return <div className="card tx disabled">
                            None of your linked addresses are eligible.
                        </div>;
                    }
                    return <>
                        {eligibleLinksWithStat!.map(linkWStat =>
                            <CardClaimableLink key={linkWStat.id} xCnf={xCnf} link={linkWStat} />
                        )}
                    </>;
                })()}
            </div>
        </div>

        {hasEligibleLinks &&
        <div className="center-element">
            <Btn onClick={onSubmit}>CLAIM ALL</Btn>
        </div>}
    </>;
};

const CardClaimableLink: React.FC<{
    xCnf: XDropConfig;
    link: LinkWithStatus;
}> = ({
    xCnf,
    link,
}) => {
    const linkedNet = capitalize(xCnf.linkNetwork);
    return <div className={`card tx ${link.status.claimed ? "disabled" : "claimable"}`}>
        <div className="card-header">
            <div className="card-title">
                {link.status.claimed
                    ? "Already claimed"
                    : formatBalance(link.status.amount, xCnf.coinDecimals) + " " + xCnf.coinTicker}
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
