import React from "react";

export const CardSpinner: React.FC = () => {
    return <div className="card">
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
