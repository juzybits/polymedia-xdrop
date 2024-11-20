import React from "react";
import { useAppContext } from "./App";

export const PageHome: React.FC = () =>
{
    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-home" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Home
            </div>

            <div className="card compact">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </div>

        </div>
    </div>
    </>;
};
