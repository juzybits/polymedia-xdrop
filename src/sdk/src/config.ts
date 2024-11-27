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
        xdropPkgId: "0x446562d08770642c22bce2e22f8ab137d2a42cee6946a5ffaef4bb1eaf2ebfbd",
        suilinkPkgId: "0xe08e44ac3b27da93a8b89916950f347fd1b39f624bad52eddbcc5e9a5bea13fa",
    },
    localnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
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
