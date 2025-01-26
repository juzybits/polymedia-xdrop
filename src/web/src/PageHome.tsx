import React from "react";
import { Link } from "react-router-dom";

import { LinkExternal } from "@polymedia/suitcase-react";

import { isProdDomain, useAppContext } from "./App";
import { Card } from "./comp/cards";
import { HeroBanner } from "./comp/hero";

export const PageHome: React.FC = () =>
{
    const { header } = useAppContext();
    return <>
        {header}
        <HeroBanner
            title="xDrop"
            description={<>Distribute Sui coins to Ethereum and Solana users.</>}
            actions={isProdDomain ? null : <Link to="/new" className="btn">GET STARTED</Link>}
        />
        <div id="page-home" className="page-regular">
            <div className="page-content">
                <SectionHowItWorks />
                {/* <SectionFeatured /> */}
                {/* <SectionCreateYours /> */}
            </div>
        </div>
    </>;
};

const SectionHowItWorks: React.FC = () =>
{
    return <>
        <div className="page-title">What is this?</div>
        <Card>
            <div className="card-desc">
                <p>xDrop is a cross-chain airdrop system built on Sui and powered by <LinkExternal href="https://www.suilink.io">SuiLink</LinkExternal>.</p>
                <p>It lets you distribute Sui coins to users on Solana, Ethereum, and other EVM chains.</p>
            </div>
        </Card>
        <div className="page-title">How does it work?</div>
        <Card>
            <div className="card-title">
                For senders
            </div>
            <div className="card-desc">
                <p>To create an xDrop, you specify eligible addresses and amounts, then  fund the xDrop with the coins you want to distribute.</p>
                <p>The criteria is up to you: it could be Ethereum NFT holders, Solana DEX traders, or any other group you want to target.</p>
            </div>
        </Card>
        <Card>
            <div className="card-title">
                For recipients
            </div>
            <div className="card-desc">
                <p>To claim an xDrop, verify your Solana or Ethereum address on SuiLink.</p>
                <p>Then, if your address is eligible, you can claim your coins on Sui.</p>
            </div>
        </Card>
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
