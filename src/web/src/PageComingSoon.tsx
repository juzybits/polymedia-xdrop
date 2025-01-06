import React from "react";
import { useAppContext } from "./App";

export const PageComingSoon: React.FC = () =>
{
    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-coming-soon" className="page-regular">
        <div className="page-content">
            <div className="page-title">
                COMING SOON
            </div>
        </div>
    </div>
    </>;
};
