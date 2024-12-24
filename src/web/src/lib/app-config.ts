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
        coinType: "0xf70b9867d65a875ab1a6c5558976594f078b32dfbd87acf61f10912b8bf12aba::dogcoin::DOGCOIN",
        xdropId: "0x6006e48df80287edd5900ba732b6e6660bfb565fc67c5fbd19ccf5da93f22d86",

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
