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
    devLinkedAddrs: string[];
    devClaimAmounts: bigint[];
};

const config: AppConfig = {
    "detf": {
        // devnet
        // coinType: "0x0016c1038872de4716b20d2090db9ca82f0bb3ae3ca8b022be6549b02261afec::dogcoin::DOGCOIN",
        // xdropId: "0x79ce3171baaabc27dde45a4abca7ae4e1772644e5e91e9c9a7d240f277242f3a",

        // mainnet
        coinType: "0x3ae523189d789ee095392c1fae27d99d75121182d8a2834cda761988d546427f::dogcoin::DOGCOIN",
        xdropId: "0x67822420fef0100714c22f8ffe81d10dad7f2fbafec20e018af8e78beafc2153",

        coinTicker: "DOGCOIN",
        coinDecimals: 9,
        linkNetwork: "ethereum",
        // bannerUrl: "/img/banner-detf.webp",
        bannerUrl: "https://dummyimage.com/1500x500/011346/eee/",
        devLinkedAddrs: [
            "0x0000000000000000000000000000000000000000",
            "0x1111111111111111111111111111111111111111",
            "0xccfbf70e03c97c0137cd3c0b5009e8ad4942b84d",
            "0xddbac1074966ca45a35455f8710e5bca39e3f8e6",
            "0xe0180ffc8ecea5744cdf28161760cc61c003c08f",
        ],
        devClaimAmounts: [
            100n * 1_000_000_000n,
            200n * 1_000_000_000n,
            5000n * 1_000_000_000n,
            5000n * 1_000_000_000n,
            5000n * 1_000_000_000n,
        ],
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
