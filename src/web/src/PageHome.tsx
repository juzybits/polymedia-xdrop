import React from "react";
import { useAppContext } from "./App";
import { HeroBanner } from "./comp/hero";

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
                    Distribute Sui coins to Ethereum and Solana users.
                </>} />

            <SectionHowItWorks />

            {/* <SectionFeatured /> */}

            {/* <SectionCreateYours /> */}

        </div>
    </div>
    </>;
};

const SectionHowItWorks: React.FC = () =>
{
    return <div>
        <div className="page-section">
            <div className="page-title">How it works</div>
            <div className="card compact">
                <div className="card-description">
                    <p>
                        1. Admin creates an xDrop by sending coins to a Sui smart contract and defining which Ethereum or Solana addresses can claim them.
                    </p>
                </div>
            </div>
            <div className="card compact">
                <div className="card-description">
                    <p>
                        2. Eligible users prove ownership of their Ethereum or Solana address through SuiLink, then claim their allocated coins on Sui.
                    </p>
                </div>
            </div>
        </div>
    </div>;
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
