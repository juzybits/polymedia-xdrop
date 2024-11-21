import { NetworkName } from "@polymedia/suitcase-core";
import { LinkNetwork } from "@polymedia/xdrop-sdk";

export type WebConfig = {
    xdropId: string;
    coinType: string;
    coinDecimals: number;
    coinTicker: string;
    linkNetwork: LinkNetwork;
};

const config: WebConfig = {
    xdropId: "0x123",
    coinType: "0x123::detf::detf",
    coinDecimals: 9,
    coinTicker: "DETF",
    linkNetwork: "ethereum",
};

export const WEB_CONFIG: Record<NetworkName, WebConfig> = {
    "mainnet": config,
    "testnet": config,
    "devnet": config,
    "localnet": config,
};

export function getWebConfig(network: NetworkName): WebConfig {
    return WEB_CONFIG[network];
}
