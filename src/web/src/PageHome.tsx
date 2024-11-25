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
                </>} />

            {/* <SectionFeatured />

            <SectionCreateYours /> */}

        </div>
    </div>
    </>;
};

// const SectionFeatured: React.FC = () =>
// {
//     const { appCnf } = useAppContext();
//     const xDrops = Object.values(appCnf);
//     if (xDrops.length === 0) {
//         return null;
//     }

//     return <div>
//     <div className="page-section">
//         <div className="page-title">
//             Featured xDrops
//         </div>
//         {xDrops.map(cnf => (
//             <div className="card compact">
//                 <div className="card-title">
//                     <p>{cnf.coinTicker}</p>
//                 </div>
//                 {cnf.bannerUrl && <img src={cnf.bannerUrl} alt="banner" />}
//             </div>
//             ))}
//         </div>
//     </div>;
// };

// const SectionCreateYours: React.FC = () =>
// {
//     return <div>
//         <div className="page-section">
//             <div className="page-title">Create xDrop</div>
//             <div className="card compact">
//                 <div className="card-description">
//                     <p>
//                         Create your own xDrop to distribute coins to your community. Contact @juzybits on X or Telegram.
//                     </p>
//                 </div>
//             </div>
//         </div>
//     </div>;
// };
