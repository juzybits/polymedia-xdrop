import { NetworkName } from "@polymedia/suitcase-core";
import { LinkNetwork } from "@polymedia/xdrop-sdk";

export type AppConfig = Record<string, XDropConfig>;

export type XDropConfig = {
    xdropId: string;
    coinType: string;
    coinDecimals: number;
    coinTicker: string;
    linkNetwork: LinkNetwork;
    devLinkedAddrs: string[];
    devClaimAmounts: bigint[];
};

const config: AppConfig = {
    "detf": {
        coinTicker: "DOGCOIN",
        coinType: "0x0016c1038872de4716b20d2090db9ca82f0bb3ae3ca8b022be6549b02261afec::dogcoin::DOGCOIN",
        coinDecimals: 9,
        xdropId: "0xce080e4ae26f39b1ebd7335c0518de0a2f8d2319962d8a16b7d19ac3e2ce67c0",
        linkNetwork: "ethereum",
        devLinkedAddrs: [
            "eth address 1",
            "eth address 2",
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
