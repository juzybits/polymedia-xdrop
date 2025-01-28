import { useAppContext } from "./App";
import { Card } from "./comp/cards";

export const PageNotFound = () =>
{
    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-not-found" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                Page not found
            </div>

            <Card>
                <div className="card-desc center-text">
                    <p>
                        This page does not exist.
                    </p>
                </div>
            </Card>
        </div>

    </div>
    </>;
};
