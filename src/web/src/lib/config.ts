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
    xdropId: "0x123",
    coinType: "0x123::detf::detf",
    coinDecimals: 9,
    coinTicker: "DETF",
    linkNetwork: "ethereum",
    linkedAddrs: [
        "eth address 1",
        "eth address 2",
    ],
    claimAmounts: [
        100n,
        200n,
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
