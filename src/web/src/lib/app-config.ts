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
        coinTicker: "DOGCOIN",
        coinType: "0x0016c1038872de4716b20d2090db9ca82f0bb3ae3ca8b022be6549b02261afec::dogcoin::DOGCOIN",
        coinDecimals: 9,
        xdropId: "0x79ce3171baaabc27dde45a4abca7ae4e1772644e5e91e9c9a7d240f277242f3a",
        linkNetwork: "ethereum",
        bannerUrl: "/img/banner-detf.webp",
        devLinkedAddrs: [
            "0x0000000000000000000000000000000000000000",
            "0x1111111111111111111111111111111111111111",
        ],
        devClaimAmounts: [
            100n * 1_000_000_000n,
            200n * 1_000_000_000n,
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
