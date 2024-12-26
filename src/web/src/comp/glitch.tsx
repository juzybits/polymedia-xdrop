import React from "react";

export const Glitch: React.FC<{
    text: string;
}> = ({
    text,
}) =>
{
    return <div className="glitch">
        <span aria-hidden="true">{text}</span>
        {text}
        <span aria-hidden="true">{text}</span>
    </div>;
};
