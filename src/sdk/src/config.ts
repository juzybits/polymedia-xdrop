// === network ===

import { NetworkName } from "@polymedia/suitcase-core";

export type ObjectIds = {
    xdropPackageId: string;
    suilinkPackageId: string;
};

export const OBJECT_IDS: Record<NetworkName, ObjectIds> = {
    mainnet: {
        xdropPackageId: "",
        suilinkPackageId: "",
    },
    testnet: {
        xdropPackageId: "",
        suilinkPackageId: "",
    },
    devnet: {
        xdropPackageId: "",
        suilinkPackageId: "",
    },
    localnet: {
        xdropPackageId: "",
        suilinkPackageId: "",
    },
};

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
