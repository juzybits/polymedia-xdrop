import React from "react";
import { useAppContext } from "./App";

export const PageNotFound: React.FC = () =>
{
    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-not-found" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Page not found
            </div>

            <div className="card compact">
                <div className="card-description center-text">
                    <p>
                        The page you are looking for does not exist.
                    </p>
                </div>
            </div>
        </div>

    </div>
    </>;
};
