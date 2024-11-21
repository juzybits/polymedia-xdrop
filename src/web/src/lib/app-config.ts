import { NetworkName } from "@polymedia/suitcase-core";
import { LinkNetwork } from "@polymedia/xdrop-sdk";

export type AppConfig = {
    xdropId: string;
    coinType: string;
    coinDecimals: number;
    coinTicker: string;
    linkNetwork: LinkNetwork;
    linkedAddrs: string[];
    claimAmounts: bigint[];
};

const config: AppConfig = {
    coinTicker: "DOGCOIN",
    coinType: "0xe4028d51c08dd03311e52669e29a800791da33e06d4bc5725c8f63165de7275d::dogcoin::DOGCOIN",
    coinDecimals: 9,
    xdropId: "0xb7c734fc0270864904f5377fb4cca3f1441dfe7a3a49a16f9ff0cad9fbf849c8",
    linkNetwork: "ethereum",
    linkedAddrs: [
        "eth address 1",
        "eth address 2",
    ],
    claimAmounts: [
        100n * 1_000_000_000n,
        200n * 1_000_000_000n,
    ],
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
