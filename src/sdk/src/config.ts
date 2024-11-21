// === network ===

import { NetworkName } from "@polymedia/suitcase-core";

export type NetworkConfig = {
    xdropPkgId: string;
    suilinkPkgId: string;
};

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        xdropPkgId: "",
        suilinkPkgId: "0xf857fa9df5811e6df2a0240a1029d365db24b5026896776ddd1c3c70803bccd3", // v1
    },
    testnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
    devnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
    localnet: {
        xdropPkgId: "0x8df131dd352568caf039f4c3f9684177ceab2d9021cb44b6224e017517d4d0b0",
        suilinkPkgId: "0x39f8f1545bf13baa4c88d5143c4668e4bd481dbe5d0e7f43e156a0b3d8ccaa89",
    },
};

export function getNetworkConfig(network: NetworkName): NetworkConfig {
    return NETWORK_CONFIG[network];
}

// === SuiLink package ===

export type LinkNetwork = "ethereum" | "solana";

export function getLinkType(
    pkgId: string,
    network: LinkNetwork,
    level: "outer" | "inner",
): string
{
     const moduleAndStruct = network === "ethereum" ? "ethereum::Ethereum" : "solana::Solana";
     const innerType = `${pkgId}::${moduleAndStruct}`;
     return level === "inner" ? innerType : `${pkgId}::suilink::SuiLink<${innerType}>`;
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
