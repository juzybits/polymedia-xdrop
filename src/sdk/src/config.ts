import { ErrorInfos, NetworkName } from "@polymedia/suitcase-core";

export type NetworkConfig = {
    xdropPkgId: string;
    suilinkPkgId: string;
};

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
    mainnet: {
        xdropPkgId: "0x1eae91a342d65986eeb1e727146442313d623edcbd4f3595190e6587c20f8d9d",
        suilinkPkgId: "0xf857fa9df5811e6df2a0240a1029d365db24b5026896776ddd1c3c70803bccd3", // v1
    },
    testnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
    devnet: {
        xdropPkgId: "0x0a19b7df0b05695ad1e91c70085912bda3ccfb116f038841ea926ab3971d831f",
        suilinkPkgId: "0x6a52dc55e51d543ddf82cb76a85d72ee9072f10ff8053d80a36245df4a563f99",
    },
    localnet: {
        xdropPkgId: "",
        suilinkPkgId: "",
    },
};

export function getNetworkConfig(network: NetworkName): NetworkConfig {
    return NETWORK_CONFIG[network];
}

export const ERRORS: ErrorInfos = {
    3000: { symbol: "E_ADDRESS_NOT_FOUND", msg: "Address not eligible for claiming" },
    3001: { symbol: "E_ALREADY_CLAIMED", msg: "Coins already claimed by this address" },
    3002: { symbol: "E_NOT_ADMIN", msg: "Only admin can perform this action" },
    3003: { symbol: "E_LENGTH_MISMATCH", msg: "Number of addresses must match number of amounts" },
    3004: { symbol: "E_ADDRESS_ALREADY_ADDED", msg: "Address already in the claims list" },
    3005: { symbol: "E_ZERO_AMOUNT", msg: "Cannot add claim with zero value" },
    3006: { symbol: "E_ZERO_LENGTH_VECTOR", msg: "Must provide at least one address and amount" },
    3007: { symbol: "E_AMOUNT_MISMATCH", msg: "Sum of all claims must equal provided coin value" },
    3008: { symbol: "E_ENDED", msg: "Not allowed because xDrop has ended" },
    3009: { symbol: "E_NOT_ENDED", msg: "Only allowed if xDrop has ended" },
    3010: { symbol: "E_NOT_OPEN", msg: "xDrop is not open for claims" },
    3011: { symbol: "E_NOT_PAUSED", msg: "xDrop is not paused" },
    3012: { symbol: "E_ZERO_LENGTH_ADDRESS", msg: "Address cannot be empty" },
};

export const FEE: {
    bps: bigint;
    addr: string;
} = {
    bps: 20n,
    addr: "0xda55c41d7cdebe663ed2abcfbb8d8e9351f796443513b6655d360d78f6c17035",
};

export const CLEANER_ADDR: Record<NetworkName, string> = {
    mainnet: "0xe450a68cdc1df43810ebbd1e49f2e5c29bc4b5a04b7917a6059e043ecd75d152",
    testnet: "0x00ac6b954c3756efeb806b4c9e2e38bcd5095c73317f84b747ae9f95b97bbfc7",
    devnet: "0x00ac6b954c3756efeb806b4c9e2e38bcd5095c73317f84b747ae9f95b97bbfc7",
    localnet: "0x00ac6b954c3756efeb806b4c9e2e38bcd5095c73317f84b747ae9f95b97bbfc7",
};
