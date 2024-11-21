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
    xdropId: "0x108b93ddbf235a35e944eab12c2ac23a648db38f216ae4bce36f58e3b71809aa",
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
