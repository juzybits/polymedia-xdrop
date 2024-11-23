import { LinkExternal } from "@polymedia/suitcase-react";
import React from "react";
import { useAppContext } from "./App";
import { HeroBanner } from "./comps/hero";

export const PageHome: React.FC = () =>
{
    const { header } = useAppContext();
    return <>
    {header}
    <div id="page-home" className="page-regular">

        <div className="page-content">

            <HeroBanner
                    title="xDrop"
                    description={<>
                        A cross-chain system for coin distributions across different blockchains.
                        <br /><br />
                        Prove ownership of your Solana/Ethereum address, then claim coins on Sui.
                        <br /><br />
                        Fast, safe, and powered by <LinkExternal href="https://www.suilink.io/">SuiLink</LinkExternal>.
                    </>} extra={undefined}            />

        </div>
    </div>
    </>;
};
