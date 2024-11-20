// === network ===

import { NetworkName } from "@polymedia/suitcase-core";

export type ObjectIds = {
    xdropPkgId: string;
    suilinkPkgId: string;
};

export const OBJECT_IDS: Record<NetworkName, ObjectIds> = {
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
        xdropPkgId: "",
        suilinkPkgId: "",
    },
};

// === SuiLink package ===

export type LinkNetwork = "ethereum" | "solana";

export function getLinkType(pkgId: string, network: LinkNetwork): string {
    const moduleAndType = network === "ethereum" ? "ethereum::Ethereum" : "solana::Solana";
    return `${pkgId}::suilink::SuiLink<${pkgId}::${moduleAndType}>`;
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
