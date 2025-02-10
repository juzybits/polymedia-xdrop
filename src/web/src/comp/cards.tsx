import { CoinMetadata } from "@mysten/sui/client";
import React from "react";

import { formatBalance } from "@polymedia/suitcase-core";
import { Card, CardDetail, LinkToExplorer } from "@polymedia/suitcase-react";
import { LinkNetwork, XDrop, XDropIdentifier, XDropStatus } from "@polymedia/xdrop-sdk";

import { useAppContext } from "../app/context";

export const CardXDropDetails = ({ xdrop, title, extraDetails, button, statusClass }: {
    xdrop: XDropIdentifier & { status: XDropStatus; network_name: LinkNetwork };
    title?: React.ReactNode;
    extraDetails?: React.ReactNode;
    button?: React.ReactNode;
    statusClass?: string;
}) => {
    // return null;
    const { explorer, network } = useAppContext();
    return (
        <Card>
            {title && <div className="card-title">{title}</div>}
            <div className="card-details">
                <CardDetail label="Status:" val={<XDropStatusLabel status={xdrop.status} />} className={statusClass} />
                <CardDetail label="Network:" val={xdrop.network_name} />
                <CardDetail label="xDrop ID:" val={<LinkToExplorer addr={xdrop.id} kind="object" explorer={explorer} network={network} />} />
                <CardDetail label="Coin type:" val={<LinkToExplorer addr={xdrop.type_coin} kind="coin" explorer={explorer} network={network} />} />
                {extraDetails}
            </div>
            {button}
        </Card>
    );
};

export const XDropDetailBalance = ({
    xdrop, coinMeta, detailClass
}: {
    xdrop: XDrop;
    coinMeta: CoinMetadata;
    detailClass?: string;
}) => {
    const claimed = formatBalance(
        xdrop.stats.amount_claimed,
        coinMeta.decimals,
        "compact",
    );
    const total = formatBalance(
        xdrop.stats.amount_claimed + xdrop.stats.amount_unclaimed,
        coinMeta.decimals,
        "compact",
    );
    return <CardDetail
        label="Balance claimed/total:"
        val={`${claimed} / ${total}`}
        className={detailClass}
    />;
};

export const XDropDetailAddrs = ({
    xdrop, detailClass
}: {
    xdrop: XDrop;
    detailClass?: string;
}) => {
    const claimed = xdrop.stats.addrs_claimed;
    const total = xdrop.stats.addrs_claimed + xdrop.stats.addrs_unclaimed;
    return <CardDetail
        label="Addresses claimed/total:"
        val={`${claimed} / ${total}`}
        className={detailClass}
    />;
};

export const XDropStatusLabel = ({ status }: {
    status: XDropStatus;
}) => {
    if (status === "open")   return <label className="text-green">Open</label>;
    if (status === "paused") return <label className="text-orange">Paused</label>;
    if (status === "ended")  return <label className="text-red">Ended</label>;
    throw new Error(`Unknown status: ${status}`);
};
