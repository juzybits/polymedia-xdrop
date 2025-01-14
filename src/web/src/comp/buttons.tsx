import { Btn, LinkExternal } from "@polymedia/suitcase-react";
import { Link } from "react-router-dom";
import { forwardRef, ComponentProps } from "react";

export const BtnSubmit: typeof Btn = (props) => {
    return (
        <div className="btn-submit">
            <Btn {...props} />
        </div>
    );
};

export const BtnLinkExternal: typeof LinkExternal = (props) => {
    const className = props.className ? `btn ${props.className}` : 'btn';
    return (
        <div className="btn-submit">
            <LinkExternal {...props} className={className} />
        </div>
    );
};

export const BtnLinkInternal = forwardRef<
    HTMLAnchorElement,
    ComponentProps<typeof Link>
>((props, ref) => {
    const className = props.className ? `btn ${props.className}` : 'btn';
    return (
        <div className="btn-submit">
            <Link {...props} className={className} ref={ref} />
        </div>
    );
});
