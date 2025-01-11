import React from "react";
import { Link } from "react-router-dom";
import { isProdDomain, useAppContext } from "./App";
import { HeroBanner } from "./comp/hero";
import { Card } from "./comp/cards";

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
                </>}
                actions={isProdDomain ? null : <Link to="/new" className="btn">GET STARTED</Link>} />

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
            <Card>
                <div className="card-desc">
                    <p>
                        1. Admin creates a Sui xDrop and specifies which Ethereum or Solana addresses can claim coins.
                    </p>
                </div>
            </Card>
            <Card>
                <div className="card-desc">
                    <p>
                        2. Users verify their Ethereum or Solana address via SuiLink and can then claim coins on Sui.
                    </p>
                </div>
            </Card>
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
//             <Card>
//                 <div className="card-title">
//                     <p>{cnf.coinTicker}</p>
//                 </div>
//                 {cnf.bannerUrl && <img src={cnf.bannerUrl} alt="banner" />}
//             </Card>
//             ))}
//         </div>
//     </div>;
// };

// const SectionCreateYours: React.FC = () =>
// {
//     return <div>
//         <div className="page-section">
//             <div className="page-title">Create xDrop</div>
//             <Card>
//                 <div className="card-desc">
//                     <p>
//                         Create your own xDrop to distribute coins to your community. Contact @juzybits on X or Telegram.
//                     </p>
//                 </div>
//             </Card>
//         </div>
//     </div>;
// };
