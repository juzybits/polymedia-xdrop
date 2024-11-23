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
        xdropPkgId: "0x0aee77785a7031020fdd8c6231dffe8a6278b7c66bde39d1395e1e6637b01ad9",
        suilinkPkgId: "0x2e08f9c2768eaff9707809c4f8de581bafcb16d0d213294ef6ede159712ea966",
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
