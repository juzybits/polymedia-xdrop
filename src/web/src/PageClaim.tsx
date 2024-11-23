import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { formatBalance, shortenAddress } from "@polymedia/suitcase-core";
import { LinkExternal, useFetch } from "@polymedia/suitcase-react";
import { LinkNetwork, SuiLink } from "@polymedia/xdrop-sdk";
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
    const linkedNetName = xCnf.linkNetwork === "ethereum" ? "Ethereum" : "Solana";

    return <>
    {header}
    <div id="page-claim" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Claim Sui {xCnf.coinTicker}
            </div>

            <div className="card compact">
                <div className="card-title">
                    <p>Step 1: Link your {linkedNetName} address</p>
                </div>
                <div className="card-description">
                    <p>Prove ownership of your {linkedNetName} address by linking it to your Sui address.</p>
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
                    Once your {linkedNetName} address is linked, you can claim the same amount of Sui {xCnf.coinTicker} as you hold on {linkedNetName}.
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
            return await xdropClient.getClaimableAmounts(
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

    const disableSubmit = isWorking || !currAcct || !links.data || !amounts.data;

    const onSubmit = async () => {
        if (disableSubmit) { return; }

        try {
            setIsWorking(true);
            const resp = await xdropClient.userClaims(
                currAddr,
                xCnf.coinType,
                xCnf.linkNetwork,
                xCnf.xdropId,
                links.data!.map(l => l.id),
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

    return <>
            <div className="card-title">Claimable amounts</div>
            <div className="card-description">
                {amounts.data && links.data && ( // have the same length
                    <div className="card-list tx-list">
                        {links.data.map((link, i) => {
                            const amount = amounts.data![i];
                            return amount === null ? null : (
                                <CardClaimableItem
                                    key={link.id}
                                    xCnf={xCnf}
                                    link={link}
                                    amount={amount}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        <div className="center-element">
            <Btn onClick={onSubmit}>CLAIM ALL</Btn>
        </div>
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
    const { explorer, network } = useAppContext();
    const linkedNetName = xCnf.linkNetwork === "ethereum" ? "Ethereum" : "Solana";
    return <div className={"card compact"}>
        <div className="card-header">
            <div className="card-title">
                {formatBalance(amount, xCnf.coinDecimals)} {xCnf.coinTicker}
            </div>
        </div>
        <div className="card-body">
            <div>
                {linkedNetName} address: <LinkExternal href={linkedAddrUrl(xCnf.linkNetwork, link.network_address)}>
                    {shortenLinkedAddr(link.network_address)}
                </LinkExternal>
            </div>
        </div>
    </div>;
};

function shortenLinkedAddr(addr: string): string {
    return addr.slice(0, addr.startsWith("0x") ? 6 : 4)
        + "…" + addr.slice(-4);
}

function linkedAddrUrl(network: LinkNetwork, addr: string): string {
    return `https://${network === "ethereum" ? "etherscan" : "solscan"}.io/address/${addr}`;
}
