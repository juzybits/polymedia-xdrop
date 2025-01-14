import { Btn, LinkExternal } from "@polymedia/suitcase-react";
import { Link } from "react-router-dom";

export const BtnSubmit: typeof Btn = (props) => {
    return (
        <div className="btn-submit">
            <Btn {...props} />
        </div>
    );
};
