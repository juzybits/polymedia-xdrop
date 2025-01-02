import { NetworkName } from "@polymedia/suitcase-core";

export type NetworkConfig = {
    xdropPkgId: string;
    suilinkPkgId: string;
};

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        xdropPkgId: "0xfd49598e3c949b4a3e4b49c83f81ffc3278cba0391e5661bc676745d8d7c154c",
        suilinkPkgId: "0xf857fa9df5811e6df2a0240a1029d365db24b5026896776ddd1c3c70803bccd3", // v1
    },
    testnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
    devnet: {
        xdropPkgId: "0x6f0c03e62544464881915e2cc79688f1da06670419596764ca10c4ac53c0b87b",
        suilinkPkgId: "0x9e833a61b4e0461aa1f81432b07b1f80857e8402252e96ee6de835e8a5a6e672",
    },
    localnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
};

export function getNetworkConfig(network: NetworkName): NetworkConfig {
    return NETWORK_CONFIG[network];
}

export const ERRORS_CODES: Record<number, string> = {
    3000: "E_ADDRESS_NOT_FOUND",
    3001: "E_ALREADY_CLAIMED",
    3002: "E_NOT_ADMIN",
    3003: "E_LENGTH_MISMATCH",
    3004: "E_ADDRESS_ALREADY_ADDED",
    3005: "E_ZERO_AMOUNT",
    3006: "E_ZERO_LENGTH_VECTOR",
    3007: "E_AMOUNT_MISMATCH",
    3008: "E_ENDED",
    3009: "E_NOT_ENDED",
    3010: "E_NOT_OPEN",
    3011: "E_ZERO_LENGTH_ADDRESS",
};
