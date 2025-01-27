import { CoinMetadata } from "@mysten/sui/client";
import React from "react";

import { NetworkName } from "@polymedia/suitcase-core";
import { XDrop } from "@polymedia/xdrop-sdk";

export type CustomXDropConfig = {
    xdropId: string;
    bannerUrl?: string;
    step2?: CustomStep;
    step3?: CustomStep;
};

export type CustomStep = (xdrop: XDrop, coinMeta: CoinMetadata) => React.ReactNode;

const step2Migration: CustomStep = (xdrop, coinMeta) => <>
    <div className="card-desc">
        <p>Prove that you own {coinMeta.symbol} on {xdrop.network_name} by linking your {xdrop.network_name} address to your Sui wallet.</p>
    </div>
    <div className="card-desc">
        <p>If you hold {coinMeta.symbol} in multiple addresses, you can link them all to the same Sui wallet.</p>
    </div>
</>;

const step3Migration: CustomStep = (xdrop, coinMeta) => <>
    <div className="card-desc">
        <p>You'll receive the same amount of {coinMeta.symbol} on Sui as you have in your {xdrop.network_name} address.</p>
    </div>
</>;

export const CUSTOM_XDROPS: Record<
    NetworkName,
    Record<string, CustomXDropConfig>
> = {
    "mainnet": {
        "demo": {
            xdropId: "0x53d19097beb34b0be5ffb3994a0b7d3100c7a12f217a2cdb4beb020743d7be2f", // DEMO
            bannerUrl: "/img/banner-detf.webp",
            step2: step2Migration,
            step3: step3Migration,
        },
    },
    "testnet": {},
    "devnet": {
        "demo": {
            xdropId: "0x02b38f71ce00443d4bc78249d4b98aed6da2779ec29be253c07c4ef924d8376a",
            bannerUrl: "https://dummyimage.com/1600x900/011346/eee/",
            step2: step2Migration,
            step3: step3Migration,
        },
    },
    "localnet": {},
};
