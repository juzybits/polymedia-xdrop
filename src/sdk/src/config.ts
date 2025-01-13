import { NetworkName } from "@polymedia/suitcase-core";

export type NetworkConfig = {
    xdropPkgId: string;
    suilinkPkgId: string;
};

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        xdropPkgId: "0xd40360c2d8d7f8125a015b270dcd2b369bccde4861407e4d61b48c3891fb1086",
        suilinkPkgId: "0xf857fa9df5811e6df2a0240a1029d365db24b5026896776ddd1c3c70803bccd3", // v1
    },
    testnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
    devnet: {
        xdropPkgId: "0x5b0b87bd59264f56a16fe9f0a8bf1b42e01dd17684f424d6c7c51cea2b92d683",
        suilinkPkgId: "0xcfb386a5a35790015d1356886fbf62be0e97801f569e045a4ab2432d21378cd7",
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
    3011: "E_NOT_PAUSED",
    3012: "E_ZERO_LENGTH_ADDRESS",
};
