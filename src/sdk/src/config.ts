// === network ===

import { NetworkName } from "@polymedia/suitcase-core";

export type NetworkConfig = {
    xdropPkgId: string;
    suilinkPkgId: string;
};

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        xdropPkgId: "0x75f50a21aca30dacca617283f61bb5feea2c001cd6e3e79989601443800ef0c8",
        suilinkPkgId: "0xf857fa9df5811e6df2a0240a1029d365db24b5026896776ddd1c3c70803bccd3", // v1
    },
    testnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
    devnet: {
        xdropPkgId: "0x1c431d2d2a261e6e5922cb5ad624cf10bbe8e0fb06af736eb3bca345f405633c",
        suilinkPkgId: "0x3431a69f78bd11a1e34cf2142301830e24d89ed2d5bf63b854508d20eb32d284",
    },
    localnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
};

export function getNetworkConfig(network: NetworkName): NetworkConfig {
    return NETWORK_CONFIG[network];
}

// === auction package ===

export const ERRORS_CODES: Record<number, string> = {
    3000: "E_ADDRESS_NOT_FOUND",
    3001: "E_ALREADY_CLAIMED",
    3002: "E_NOT_ADMIN",
    3003: "E_LENGTH_MISMATCH",
    3004: "E_ADDRESS_ALREADY_ADDED",
    3005: "E_ZERO_AMOUNT",
    3006: "E_AMOUNT_MISMATCH",
    3007: "E_ENDED",
    3008: "E_NOT_ENDED",
    3009: "E_NOT_OPEN",
};
