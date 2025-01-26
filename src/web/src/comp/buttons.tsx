import { forwardRef, ComponentProps } from "react";
import { Link } from "react-router-dom";

import { Btn, LinkExternal } from "@polymedia/suitcase-react";

export const BtnSubmit: typeof Btn = (props) => {
    return (
        <div className="btn-submit">
            <Btn {...props} />
        </div>
    );
};

export const BtnLinkExternal = (props: ComponentProps<typeof LinkExternal> & { disabled?: boolean }) => {
    let className = "btn";
    if (props.className) { className += ` ${props.className}`; }
    if (props.disabled)  { className += " disabled"; }
    return (
        <div className="btn-submit">
            <LinkExternal {...props} className={className} />
        </div>
    );
};

export const BtnLinkInternal = forwardRef<
    HTMLAnchorElement,
    ComponentProps<typeof Link> & { disabled?: boolean }
>((props, ref) => {
    let className = "btn";
    if (props.className) { className += ` ${props.className}`; }
    if (props.disabled)  { className += " disabled"; }
    return (
        <div className="btn-submit">
            <Link {...props} className={className} ref={ref} />
        </div>
    );
});
