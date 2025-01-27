import { useCurrentAccount, useDisconnectWallet, useWallets } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import React, { useEffect } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import { shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch, UseFetchResult } from "@polymedia/suitcase-react";
import { LinkWithStatus, SuiLink, XDrop } from "@polymedia/xdrop-sdk";

import { useAppContext } from "./App";
import { BtnLinkExternal, BtnSubmit } from "./comp/buttons";
import { Card, CardMsg, CardSpinner } from "./comp/cards";
import { ConnectToGetStarted } from "./comp/connect";
import { useXDrop } from "./comp/hooks";
import { XDropLoader } from "./comp/loader";
import { showConfetti } from "./lib/confetti";
import { CUSTOM_XDROPS, CustomXDropConfig } from "./lib/custom";
import { fmtBal, foreignAddrUrl, shortenForeignAddr } from "./lib/helpers";
import { PageNotFound } from "./PageNotFound";

type OwnedLinks = {
    allLinks: SuiLink[];
    eligibleLinks: LinkWithStatus[];
    claimableLinks: LinkWithStatus[];
};

const EMPTY_OWNED_LINKS: OwnedLinks = {
    allLinks: [],
    eligibleLinks: [],
    claimableLinks: [],
} as const;

export const PageClaim: React.FC = () =>
{
    // === state ===

    // URL state
    let { xdropId } = useParams();
    if (!xdropId) return <PageNotFound />;

    // app state
    const currAcct = useCurrentAccount();
    const currAddr = currAcct?.address ?? null;
    const { header, network, xdropClient } = useAppContext();

    // override xdropId if custom xDrop
    const custom = CUSTOM_XDROPS[network][xdropId] ?? null;
    xdropId = custom?.xdropId ?? xdropId;

    // onchain state
    const fetchedXDrop = useXDrop(xdropId);
    const { xdrop, coinMeta } = fetchedXDrop.data ?? {};

    const fetchedLinks = useFetch<OwnedLinks>(async () =>
    {
        if (!currAddr || !xdrop || !coinMeta) {
            return EMPTY_OWNED_LINKS;
        }

        // Fetch SuiLink objects
        const allLinks = await xdropClient.fetchOwnedLinks(currAddr, xdrop.network_name);
        if (!allLinks?.length) {
            return EMPTY_OWNED_LINKS;
        }

        // Fetch claim statuses for those links
        const statuses = await xdropClient.fetchEligibleStatuses({
            typeCoin: xdrop.type_coin,
            linkNetwork: xdrop.network_name,
            xdropId: xdrop.id,
            addrs: allLinks.map(l => l.network_address),
            onUpdate: msg => console.debug("[fetchEligibleStatuses]", msg),
        });

        // Merge links with their statuses, filter eligible links, and sort unclaimed links first
        const eligibleLinks = allLinks
            .map((link, i) => ({
                ...link,
                status: statuses[i]
            }))
            .filter(l => l.status.eligible)
            .sort((a, b) => Number(!b.status.claimed) - Number(!a.status.claimed));

        const claimableLinks = eligibleLinks.filter(link => !link.status.claimed);

        return {
            allLinks,
            eligibleLinks,
            claimableLinks,
        };
    }, [xdrop, coinMeta, currAddr]);

    return <>
        {header}

        {custom?.bannerUrl && <div className="page-claim-banner">
            <img src={custom.bannerUrl} alt="banner" />
        </div>}

        <div id="page-claim" className="page-regular">
            <div className="page-content">

                <XDropLoader fetched={fetchedXDrop} requireWallet={false}>
                {(xdrop, coinMeta) => (
                    xdrop.is_ended ?
                    <CardEnded coinMeta={coinMeta} />
                    : <>
                        <div className="page-title">
                            Claim {coinMeta.symbol}
                        </div>
                        <CardWallet coinMeta={coinMeta} />
                        <CardLink xdrop={xdrop} coinMeta={coinMeta} custom={custom} />
                        <CardClaim xdrop={xdrop} coinMeta={coinMeta} custom={custom} fetchedLinks={fetchedLinks} />
                    </>
                )}
                </XDropLoader>

            </div>
        </div>
    </>;
};

const CardEnded: React.FC<{
    coinMeta: CoinMetadata;
}> = ({
    coinMeta,
}) => {
    return (
    <Card className="center-text">
        <div className="card-title center-element">
            {coinMeta.symbol} xDrop ended
        </div>
        <div className="card-desc">
            <p className="text-orange">Claims are no longer possible.</p>
        </div>
    </Card>
);
};

const CardWallet: React.FC<{
    coinMeta: CoinMetadata;
}> = ({
    coinMeta,
}) => {
    const wallets = useWallets();
    const hasWallet = wallets.length > 0;
    const { isWorking } = useAppContext();
    return (
    <Card>
        <div className="card-title">
            <p>Step 1: Get a Sui wallet</p>
        </div>

        {hasWallet ?
            <div className="card-desc">
                <p>✅ Your Sui wallet is installed and ready.</p>
            </div>
        : <>
            <div className="card-desc">
                <p>You need a wallet to claim your {coinMeta.symbol} on Sui. We recommend the official Sui wallet.</p>
            </div>
            <BtnLinkExternal href="https://suiwallet.com/" disabled={isWorking}>
                INSTALL WALLET
            </BtnLinkExternal>
        </>}
    </Card>
    );
};

const CardLink: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    custom: CustomXDropConfig | null;
}> = ({
    xdrop,
    coinMeta,
    custom,
}) => {
    const { isWorking } = useAppContext();
    return (
    <Card>
        <div className="card-title">
            <p>Step 2: Verify your {xdrop.network_name} address</p>
            {/* TODO: show checkmark */}
        </div>

        {custom?.step2?.(xdrop, coinMeta) ?? <>
            <div className="card-desc">
                <p>Prove ownership of your {xdrop.network_name} address by linking it to your Sui wallet.</p>
            </div>
            <div className="card-desc">
                <p>You can link multiple {xdrop.network_name} addresses to the same Sui wallet.</p>
            </div>
        </>}
        {/* TODO show "you've connected X addresses" */}
            <BtnLinkExternal href="https://www.suilink.io/" disabled={isWorking}>
                LINK ADDRESS
            </BtnLinkExternal>
    </Card>);
};

const CardClaim: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    custom: CustomXDropConfig | null;
    fetchedLinks: UseFetchResult<OwnedLinks>;
}> = ({
    xdrop,
    coinMeta,
    custom,
    fetchedLinks,
}) =>
{
    const currAcct = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    return (
        <Card>
            <div className="card-title">
                <p>Step 3: Claim your {coinMeta.symbol} on Sui</p>
            </div>

            {custom?.step3?.(xdrop, coinMeta)}

            {!currAcct ? (
                <ConnectToGetStarted msg="Connect your Sui wallet to claim." />
            ) : (
                <>
                    <div className="card-desc">
                        <p>You are connected as {shortenAddress(currAcct.address)} (<a onClick={() => disconnect()}>disconnect</a>).</p>
                    </div>
                    <WidgetClaim
                        xdrop={xdrop}
                        coinMeta={coinMeta}
                        currAddr={currAcct.address}
                        fetchedLinks={fetchedLinks}
                    />
                </>
            )}
        </Card>
    );
};

const WidgetClaim: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    currAddr: string;
    fetchedLinks: UseFetchResult<OwnedLinks>;
}> = ({
    xdrop,
    coinMeta,
    currAddr,
    fetchedLinks,
}) =>
{
    // == state ==

    const { xdropClient, isWorking, setIsWorking } = useAppContext();

    const { err, isLoading, data, refetch } = fetchedLinks;
    const { allLinks, eligibleLinks, claimableLinks } = data ?? EMPTY_OWNED_LINKS;
    const disableSubmit = isWorking || claimableLinks.length === 0;

    // == effects ==

    useEffect(() => { // dev only
        data && console.debug("[WidgetClaim] fetchedLinks:", data);
    }, [data]);

    // == functions ==

    const onSubmit = async () => {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.userClaims(
                currAddr,
                xdrop,
                claimableLinks.map(l => l.id)
            );
            console.debug("[onSubmit] okay:", resp);
            toast.success("Success");
            showConfetti(["💰"]);
        } catch (err) {
            console.warn("[onSubmit] error:", err);
            const msg = xdropClient.errToStr(err, "Failed to claim");
            msg && toast.error(msg);
        } finally {
            setIsWorking(false);
            refetch();
        }
    };

    // === html ===

    if (err) {
        return <CardMsg>{err}</CardMsg>;
    } else if (isLoading) {
        return <CardSpinner />;
    }

    const totalClaimable = fmtBal(
        claimableLinks.reduce((sum, link) => sum + link.status.amount, 0n),
        coinMeta.decimals,
        coinMeta.symbol
    );

    return <>
        <div className="card-desc">
            <div className="card-list slim-list">
                {(() => {
                    if (allLinks.length === 0) {
                        return <Card className="slim disabled">
                            You haven't linked any addresses yet.
                        </Card>;
                    }
                    if (eligibleLinks.length === 0) {
                        return <Card className="slim disabled">
                            None of your linked addresses are eligible.
                        </Card>;
                    }
                    return <>
                        <div className="card-title" style={{ fontSize: "1.1em" }}>Claimable amounts:</div>
                        {eligibleLinks.map(linkWStat =>
                            <CardEligibleLink key={linkWStat.id} xdrop={xdrop} coinMeta={coinMeta} link={linkWStat} />
                        )}
                    </>;
                })()}
            </div>
        </div>

        {eligibleLinks.length > 0 && <>
            {!xdrop.is_open
            ? <div className="card-desc">
                <p className="text-orange">Claims are not open yet</p>
            </div>
            : claimableLinks.length === 0
            ? <div className="card-desc">
                <p className="text-green">✅ Claimed</p>
            </div>
            : <BtnSubmit disabled={disableSubmit} onClick={onSubmit}>
                CLAIM {totalClaimable}
            </BtnSubmit>}
        </>}

    </>;
};

const CardEligibleLink: React.FC<{
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    link: LinkWithStatus;
}> = ({
    xdrop,
    coinMeta,
    link,
}) => {
    return <Card className={`slim ${link.status.claimed ? "disabled" : "subcard"}`}>
        <div className="card-header">
            <div className="card-title">
                {!link.status.claimed ? "💰 " : "✅ "}
                {fmtBal(link.status.amount, coinMeta.decimals, coinMeta.symbol)}
                {link.status.claimed && " (claimed)"}
            </div>
        </div>
        <div className="card-body">
            <div>
                {xdrop.network_name} address: <LinkExternal
                    href={foreignAddrUrl(xdrop.network_name, link.network_address)}
                    className="link-external nowrap"
                >
                    {shortenForeignAddr(link.network_address)}
                </LinkExternal>
            </div>
        </div>
    </Card>;
};
