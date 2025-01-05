import { LinkToExplorer } from "@polymedia/suitcase-react";
import { XDrop, XDropStatus } from "@polymedia/xdrop-sdk";
import React from "react";
import { useAppContext } from "../App";

export const CardSpinner: React.FC<{
    className?: string;
}   > = ({
    className,
}) => {
    return <div className={`card ${className ?? ""}`}>
        <FullCardMsg>
            <div className="card-spinner" />
        </FullCardMsg>
    </div>;
};

export const CardWithMsg: React.FC<{
    className?: string;
    children: React.ReactNode;
}> = ({
    className,
    children,
}) => {
    return <div className={`card break-any ${className ?? ""}`}>
        <FullCardMsg>
            {children}
        </FullCardMsg>
    </div>;
};

export const FullCardMsg: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) => {
    return <div className="full-card-message">
        <div className="msg">
            {children}
        </div>
    </div>;
};

export const CardXDropDetails: React.FC<{
    xdrop: XDrop;
    title?: React.ReactNode;
    extraDetails?: React.ReactNode;
    button?: React.ReactNode;
}> = ({
    xdrop,
    title,
    extraDetails,
    button,
}) => {
    const { explorer, network } = useAppContext();
    return (
        <div className="card compact">
            {title && <div className="card-title">{title}</div>}
            <div className="card-details">
                <XDropDetail label="Status:" val={<XDropStatusLabel status={xdrop.status} />} />
                <XDropDetail label="Network:" val={xdrop.network_name} />
                <XDropDetail label="xDrop ID:" val={<LinkToExplorer addr={xdrop.id} kind="object" explorer={explorer} network={network} />} />
                <XDropDetail label="Coin type:" val={<LinkToExplorer addr={xdrop.type_coin} kind="coin" explorer={explorer} network={network} />} />
                {extraDetails}
            </div>
            {button &&
            <div className="card-description">
                {button}
            </div>}
        </div>
    );
};

export const XDropDetail: React.FC<{
    label: string;
    val: React.ReactNode;
}> = ({
    label,
    val,
}) => {
    return <div className="detail">
        <span className="label">{label}</span>
        <span className="value">{val}</span>
    </div>;
};

export const XDropStatusLabel: React.FC<{ status: XDropStatus }> = ({ status }) => {
    if (status === "open")   return <label className="text-green">Open</label>;
    if (status === "paused") return <label className="text-orange">Paused</label>;
    if (status === "ended")  return <label className="text-red">Ended</label>;
    throw new Error(`Unknown status: ${status}`);
};
