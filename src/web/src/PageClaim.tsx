import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { formatBalance, shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch } from "@polymedia/suitcase-react";
import { getSuiLinkNetworkType, LinkNetwork, LinkWithStatus } from "@polymedia/xdrop-sdk";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { PageNotFound } from "./PageNotFound";
import { Btn } from "./comps/button";
import { CardSpinner, CardWithMsg } from "./comps/cards";
import { BtnConnect } from "./comps/connect";
import { XDropConfig } from "./lib/app-config";
import { SubmitRes } from "./lib/misc";

export const PageClaim: React.FC = () =>
{
    // === state ===

    const { xdropId } = useParams();
    if (xdropId !== "detf") { return <PageNotFound />; }

    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const { header, appCnf } = useAppContext();
    const xCnf = appCnf[xdropId];
    const linkedNet = capitalize(xCnf.linkNetwork);

    // === html ===

    return <>
    {header}
    {xCnf.bannerUrl && <div className="page-banner">
        <img src={xCnf.bannerUrl} alt="banner" />
    </div>}
    <div id="page-claim" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Claim {xCnf.coinTicker}
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 1: Get a Sui wallet</p>
                </div>
                <div className="card-description">
                    <p>You need a wallet to claim your {xCnf.coinTicker} on Sui. We recommend the official Sui wallet.</p>
                </div>
                <div className="center-element">
                    <LinkExternal className="btn" href="https://suiwallet.com/">INSTALL WALLET</LinkExternal>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 2: Verify your {linkedNet} address</p>
                </div>
                <div className="card-description">
                    <p>Prove that you own {xCnf.coinTicker} on {linkedNet} by linking your Ethereum address to your Sui wallet.</p>
                </div>
                <div className="card-description">
                    <p>If you hold {xCnf.coinTicker} in multiple addresses, you can link them all to the same Sui wallet.</p>
                </div>
                <div className="center-element">
                    <LinkExternal className="btn" href="https://www.suilink.io/">LINK ADDRESS</LinkExternal>
                </div>
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 3: Claim your {xCnf.coinTicker} on Sui</p>
                </div>
                <div className="card-description">
                    <p>You'll receive the same amount of {xCnf.coinTicker} on Sui as you have in your {linkedNet} address.</p>
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
                    <WidgetClaim xCnf={xCnf} currAddr={currAcct.address} />
                </>}
            </div>

        </div>

    </div>
    </>;
};

type EligibleLinksWithStatus = {
    eligibleLinks: LinkWithStatus[];
    hasAnyLinks: boolean;
    hasEligibleLinks: boolean;
    hasClaimableLinks: boolean;
};

const EMPTY_LINKS_WITH_STATUS: EligibleLinksWithStatus = {
    eligibleLinks: [],
    hasAnyLinks: false,
    hasEligibleLinks: false,
    hasClaimableLinks: false,
} as const;

const WidgetClaim: React.FC<{
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
    const [ submitRes, setSubmitRes ] = useState<SubmitRes>({ ok: undefined });

    const eligibleLinksWithStatus = useFetch<EligibleLinksWithStatus>(async () =>
    {
        // Fetch SuiLink objects
        const links = await xdropClient.fetchOwnedLinks(currAddr, xCnf.linkNetwork);
        if (!links?.length) {
            return EMPTY_LINKS_WITH_STATUS;
        }

        // Fetch claim statuses for those links
        const statuses = await xdropClient.fetchClaimStatuses(
            xCnf.coinType,
            xCnf.linkNetwork,
            xCnf.xdropId,
            links.map(l => l.network_address),
        );

        // Merge links with their statuses, filter eligible links, and sort unclaimed links first
        const eligibleLinks = links
            .map((link, i) => ({
                ...link,
                status: statuses[i]
            }))
            .filter(l => l.status.eligible)
            .sort((a, b) => Number(!b.status.claimed) - Number(!a.status.claimed));

        return {
            hasAnyLinks: links.length > 0,
            hasEligibleLinks: eligibleLinks.length > 0,
            hasClaimableLinks: eligibleLinks.some(l => !l.status.claimed),
            eligibleLinks,
        };
    }, [currAddr, xCnf.linkNetwork, xCnf.coinType, xCnf.xdropId]);

    const { error, isLoading, data, refetch } = eligibleLinksWithStatus;
    const { hasAnyLinks, hasEligibleLinks, eligibleLinks } = data ?? EMPTY_LINKS_WITH_STATUS;
    const disableSubmit = !currAcct || isWorking || !data || !data.hasClaimableLinks;

    // == effects ==

    useEffect(() => { // dev only
        if (data) {
            console.debug("[ClaimWidget] eligibleLinksWithStatus.data:", data);
        }
    }, [data]);

    // == functions ==

    const onSubmit = async () => {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });
            const resp = await xdropClient.userClaims(
                currAddr,
                {
                    type_coin: xCnf.coinType,
                    type_network: getSuiLinkNetworkType(xdropClient.suilinkPkgId, xCnf.linkNetwork),
                    id: xCnf.xdropId,
                },
                eligibleLinks.map(l => l.id)
            );
            console.debug("[onSubmit] okay:", resp);
            setSubmitRes({ ok: true });
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            setSubmitRes({ ok: false, err: err instanceof Error ? err.message : String(err) });
        } finally {
            setIsWorking(false);
            refetch();
        }
    };

    // === html ===

    if (error) {
        return <CardWithMsg className="compact">{error}</CardWithMsg>;
    } else if (isLoading) {
        return <CardSpinner />;
    }

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
                        {eligibleLinks.map(linkWStat =>
                            <CardClaimableLink key={linkWStat.id} xCnf={xCnf} link={linkWStat} />
                        )}
                    </>;
                })()}
            </div>
        </div>

        {hasEligibleLinks && <>
            <div className="center-element">
                <Btn disabled={disableSubmit} onClick={onSubmit}>CLAIM ALL</Btn>
            </div>

            {submitRes.ok === true &&
            <div className="success center-element center-text">Success!</div>}

            {submitRes.ok === false && submitRes.err &&
            <div className="error center-element center-text">{submitRes.err}</div>}
        </>}

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
                    ? "Claimed"
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
