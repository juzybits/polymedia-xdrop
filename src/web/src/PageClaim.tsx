import { useCurrentAccount, useCurrentWallet, useDisconnectWallet, useWallets } from "@mysten/dapp-kit";
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

    const { header, network, isWorking } = useAppContext();

    const wallets = useWallets();
    const hasWallet = wallets.length > 0;

    // Handle custom xDrops
    const custom = CustomXDrops[network][xdropId] ?? null;
    xdropId = custom?.xdropId ?? xdropId;

    const fetched = useXDrop(xdropId);

    return <>
        {header}

        {custom?.bannerUrl && <div className="page-claim-banner">
            <img src={custom.bannerUrl} alt="banner" />
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

                            {hasWallet ?
                                <div className="card-description">
                                    <p>✅ Your Sui wallet is installed and ready.</p>
                                </div>
                            : <>
                                <div className="card-description">
                                    <p>You need a wallet to claim your {coinMeta.symbol} on Sui. We recommend the official Sui wallet.</p>
                                </div>
                                <div className="center-element">
                                    <LinkExternal className={`btn ${isWorking ? "disabled" : ""}`} href="https://suiwallet.com/">INSTALL WALLET</LinkExternal>
                                </div>
                            </>}
                        </div>

                        <div className="card compact">
                            <div className="card-title">
                                <p>Step 2: Verify your {xdrop.network_name} address</p>
                            </div>

                            {custom?.step2?.(xdrop, coinMeta) ?? <>
                                <div className="card-description">
                                    <p>Prove ownership of your {xdrop.network_name} address by linking it to your Sui wallet.</p>
                                </div>
                                <div className="card-description">
                                    <p>You can link multiple {xdrop.network_name} addresses to the same Sui wallet.</p>
                                </div>
                            </>}

                            <div className="center-element">
                                <LinkExternal className={`btn ${isWorking ? "disabled" : ""}`} href="https://www.suilink.io/">LINK ADDRESS</LinkExternal>
                            </div>
                        </div>

                        <CardClaim xdrop={xdrop} coinMeta={coinMeta} custom={custom} />
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
    custom: CustomXDropConfig | null;
}> = ({
    xdrop,
    coinMeta,
    custom,
}) =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    return (
        <div className="card compact">
            <div className="card-title">
                <p>Step 3: Claim your {coinMeta.symbol} on Sui</p>
            </div>

            {custom?.step3?.(xdrop, coinMeta)}

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
    const disableSubmit = !currAcct || isWorking || !data?.hasClaimableLinks;

    // == effects ==

    useEffect(() => { // dev only
        data && console.debug("[WidgetClaim] eligibleLinksWithStatus:", data);
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
            setSubmitRes({ ok: false, err: xdropClient.errParser.errToStr(err, "Failed to claim") });
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
                : <Btn disabled={disableSubmit} onClick={onSubmit}>CLAIM ALL</Btn>
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

// === custom xdrops ===

type CustomXDropConfig = {
    xdropId: string;
    bannerUrl?: string;
    step2?: CustomStep;
    step3?: CustomStep;
};

type CustomStep = (xdrop: XDrop, coinMeta: CoinMetadata) => React.ReactNode;

const step2Migration: CustomStep = (xdrop, coinMeta) => <>
    <div className="card-description">
        <p>Prove that you own {coinMeta.symbol} on {xdrop.network_name} by linking your {xdrop.network_name} address to your Sui wallet.</p>
    </div>
    <div className="card-description">
        <p>If you hold {coinMeta.symbol} in multiple addresses, you can link them all to the same Sui wallet.</p>
    </div>
</>;

const step3Migration: CustomStep = (xdrop, coinMeta) => <>
    <div className="card-description">
        <p>You'll receive the same amount of {coinMeta.symbol} on Sui as you have in your {xdrop.network_name} address.</p>
    </div>
</>;

const CustomXDrops: Record<
    NetworkName,
    Record<string, CustomXDropConfig>
> = {
    "mainnet": {
        "detf": {
            xdropId: "0x53d19097beb34b0be5ffb3994a0b7d3100c7a12f217a2cdb4beb020743d7be2f", // DEMO
            bannerUrl: "/img/banner-detf.webp",
            step2: step2Migration,
            step3: step3Migration,
        },
    },
    "testnet": {},
    "devnet": {
        "detf": {
            xdropId: "0x02b38f71ce00443d4bc78249d4b98aed6da2779ec29be253c07c4ef924d8376a",
            bannerUrl: "https://dummyimage.com/1600x900/011346/eee/",
            step2: step2Migration,
            step3: step3Migration,
        },
    },
    "localnet": {},
};
