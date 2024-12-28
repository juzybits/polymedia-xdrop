import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { formatBalance, NetworkName, shortenAddress } from "@polymedia/suitcase-core";
import { Btn, LinkExternal, useFetch } from "@polymedia/suitcase-react";
import { LinkNetwork, LinkWithStatus, XDrop } from "@polymedia/xdrop-sdk";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppContext } from "./App";
import { PageNotFound } from "./PageNotFound";
import { CardSpinner, CardWithMsg } from "./comp/cards";
import { BtnConnect } from "./comp/connect";
import { useXDrop, XDropLoader } from "./comp/loader";
import { ResultMsg, SubmitRes } from "./comp/submits";

export const PageClaim: React.FC = () =>
{
    let { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    const { header, network } = useAppContext();

    // Handle configured xDrops
    if (xdropId in XDropConfigs[network]) {
        xdropId = XDropConfigs[network][xdropId].xdropId;
    }
    const bannerUrl = XDropConfigs[network][xdropId]?.bannerUrl;

    const fetched = useXDrop(xdropId);

    return <>
        {header}

        {bannerUrl && <div className="page-banner">
            <img src={bannerUrl} alt="banner" />
        </div>}

        <div id="page-claim" className="page-regular">
            <div className="page-content">

                <XDropLoader fetched={fetched} requireWallet={false}>
                {(xdrop, coinMeta) => (
                    xdrop.is_ended ?
                    <>
                        <div className="card compact center-text">
                            <div className="card-title center-element">
                                {coinMeta.symbol} xDrop ended
                            </div>
                            <div className="card-description">
                                <p className="text-orange">Claims are no longer possible.</p>
                            </div>
                        </div>
                    </> : <>
                        <div className="page-title">
                            Claim {coinMeta.symbol}
                        </div>

                        <div className="card compact">
                            <div className="card-title">
                                <p>Step 1: Get a Sui wallet</p>
                            </div>
                            <div className="card-description">
                                <p>You need a wallet to claim your {coinMeta.symbol} on Sui. We recommend the official Sui wallet.</p>
                            </div>
                            <div className="center-element">
                                <LinkExternal className="btn" href="https://suiwallet.com/">INSTALL WALLET</LinkExternal>
                            </div>
                        </div>

                        <div className="card compact">
                            <div className="card-title">
                                <p>Step 2: Verify your {xdrop.network_name} address</p>
                            </div>
                            <div className="card-description">
                                <p>Prove that you own {coinMeta.symbol} on {xdrop.network_name} by linking your {xdrop.network_name} address to your Sui wallet.</p>
                            </div>
                            <div className="card-description">
                                <p>If you hold {coinMeta.symbol} in multiple addresses, you can link them all to the same Sui wallet.</p>
                            </div>
                            <div className="center-element">
                                <LinkExternal className="btn" href="https://www.suilink.io/">LINK ADDRESS</LinkExternal>
                            </div>
                        </div>

                        <CardClaim xdrop={xdrop} coinMeta={coinMeta} />
                    </>
                )}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardClaim: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
}> = ({
    xdrop,
    coinMeta,
}) => {
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    return (
        <div className="card compact">
            <div className="card-title">
                <p>Step 3: Claim your {coinMeta.symbol} on Sui</p>
            </div>
            <div className="card-description">
                <p>You'll receive the same amount of {coinMeta.symbol} on Sui as you have in your {xdrop.network_name} address.</p>
            </div>
            {!currAcct ? (
                <>
                    <div className="card-description">
                        Connect your Sui wallet to claim.
                    </div>
                    <div className="center-element">
                        <BtnConnect />
                    </div>
                </>
            ) : (
                <>
                    <div className="card-description">
                        <p>You are connected as {shortenAddress(currAcct.address)} (<a onClick={() => disconnect()}>disconnect</a>).</p>
                    </div>
                    <WidgetClaim
                        xdrop={xdrop}
                        coinMeta={coinMeta}
                        currAddr={currAcct.address}
                    />
                </>
            )}
        </div>
    );
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
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    currAddr: string;
}> = ({
    xdrop,
    coinMeta,
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
        const links = await xdropClient.fetchOwnedLinks(currAddr, xdrop.network_name);
        if (!links?.length) {
            return EMPTY_LINKS_WITH_STATUS;
        }

        // Fetch claim statuses for those links
        const statuses = await xdropClient.fetchClaimStatuses(
            xdrop.type_coin,
            xdrop.network_name,
            xdrop.id,
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
    }, [xdrop, coinMeta, currAddr]);

    const { err, isLoading, data, refetch } = eligibleLinksWithStatus;
    const { hasAnyLinks, hasEligibleLinks, eligibleLinks } = data ?? EMPTY_LINKS_WITH_STATUS;
    const disableSubmit = !currAcct || isWorking || !data || !data.hasClaimableLinks;

    // == effects ==

    useEffect(() => { // dev only
        data && console.debug("[ClaimWidget] eligibleLinksWithStatus:", data);
    }, [data]);

    // == functions ==

    const onSubmit = async () => {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            setSubmitRes({ ok: undefined });
            const resp = await xdropClient.userClaims(
                currAddr,
                xdrop,
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

    if (err) {
        return <CardWithMsg className="compact">{err}</CardWithMsg>;
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
                            <CardClaimableLink key={linkWStat.id} xdrop={xdrop} coinMeta={coinMeta} link={linkWStat} />
                        )}
                    </>;
                })()}
            </div>
        </div>

        {hasEligibleLinks && <>
            <div className="center-element">
                {!xdrop.is_open ?
                    <div className="card-description">
                        <p className="text-orange">Claims are not open yet.</p>
                    </div>
                : <Btn disabled={disableSubmit} working={isWorking} onClick={onSubmit}>CLAIM ALL</Btn>
                }
            </div>
            <ResultMsg res={submitRes} />
        </>}

    </>;
};

const CardClaimableLink: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    link: LinkWithStatus;
}> = ({
    xdrop,
    coinMeta,
    link,
}) => {
    return <div className={`card tx ${link.status.claimed ? "disabled" : "claimable"}`}>
        <div className="card-header">
            <div className="card-title">
                {link.status.claimed
                    ? "Claimed"
                    : formatBalance(link.status.amount, coinMeta.decimals) + " " + coinMeta.symbol}
            </div>
        </div>
        <div className="card-body">
            <div>
                {xdrop.network_name} address: <LinkExternal href={linkedAddrUrl(xdrop.network_name, link.network_address)}>
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
    if (network === "Ethereum") return `https://etherscan.io/address/${addr}`;
    if (network === "Solana") return `https://solscan.io/address/${addr}`;
    throw new Error(`Unsupported network: ${network}`);
}

// === config ===

export type XDropConfig = {
    xdropId: string;
    bannerUrl?: string;
};

export const XDropConfigs: Record<
    NetworkName,
    Record<string, XDropConfig>
> = {
    "mainnet": {},
    "testnet": {},
    "devnet": {
        "detf": {
            xdropId: "0x411cdfccd6a8fbc23d10a247f8477e2d123f60bc2cb62cab1f080c1cafe07ca1",
            bannerUrl: "https://dummyimage.com/1500x500/011346/eee/",
            // bannerUrl: "/img/banner-detf.webp",
        },
    },
    "localnet": {},
};
