import { NetworkName } from "@polymedia/suitcase-core";
import { LinkNetwork } from "@polymedia/xdrop-sdk";

export type AppConfig = Record<string, XDropConfig>;

export type XDropConfig = {
    xdropId: string;
    coinType: string;
    coinDecimals: number;
    coinTicker: string;
    linkNetwork: LinkNetwork;
    bannerUrl?: string;
};

const config: AppConfig = {
    "detf": {
        // mainnet
        // coinType: "0x3ae523189d789ee095392c1fae27d99d75121182d8a2834cda761988d546427f::dogcoin::DOGCOIN",
        // xdropId: "0x67822420fef0100714c22f8ffe81d10dad7f2fbafec20e018af8e78beafc2153",

        // devnet
        coinType: "0xcb5543f99fa6ab4b99aa3027d48c624764f42c16456ce286bbf005fc0cdf38d5::dogcoin::DOGCOIN",
        xdropId: "0xb8bd4b2e4b23f3887631f216e05c6508316931a8337f7141299f956f73d5509b",

        coinTicker: "DOGCOIN",
        coinDecimals: 9,
        linkNetwork: "ethereum",
        bannerUrl: "https://dummyimage.com/1500x500/011346/eee/",
        // bannerUrl: "/img/banner-detf.webp",
    },
};

export const APP_CONFIG: Record<NetworkName, AppConfig> = {
    "mainnet": config,
    "testnet": config,
    "devnet": config,
    "localnet": config,
};

export function getAppConfig(network: NetworkName): AppConfig {
    return APP_CONFIG[network];
}
