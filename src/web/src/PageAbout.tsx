import { LinkExternal } from "@polymedia/suitcase-react";
import React from "react";
import { useAppContext } from "./App";

export const PageAbout: React.FC = () =>
{
    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-about" className="page-regular">

        <div className="page-content">

            <div className="page-title">
                About XDrop
            </div>

            <div className="card compact">
                <div className="card-description">
                    <p>
                        XDrop is a cross-chain airdrop system that enables token distributions across different blockchains.
                        <br/><br/>
                        Users prove ownership of a Solana or Ethereum address, and then can claim coins on Sui.
                        <br/><br/>
                        XDrop is built on top of Mysten Lab's <LinkExternal href="https://www.suilink.io/">SuiLink</LinkExternal>.
                    </p>
                </div>
            </div>
        </div>

    </div>
    </>;
};
