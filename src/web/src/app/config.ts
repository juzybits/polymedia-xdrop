import { getFullnodeUrl } from "@mysten/sui/client";

import { NetworkName } from "@polymedia/suitcase-core";
import { isLocalhost, loadRpc } from "@polymedia/suitcase-react";
import { LinkNetwork } from "@polymedia/xdrop-sdk";

// === domains ===

const isLocalDomain = isLocalhost();
const isDevDomain = "dev.polymedia-xdrop.pages.dev" === window.location.hostname;
const isTestDomain = "test.polymedia-xdrop.pages.dev" === window.location.hostname;
export const isProdDomain = "xdrop.polymedia.app" === window.location.hostname;

// === sui networks ===

export const [ defaultNetwork, supportedNetworks ] =
    isLocalDomain  ? ["devnet" as const, ["mainnet", "testnet", "devnet", "localnet"] as const]
    : isDevDomain  ? ["devnet"   as const, ["devnet"] as const]
    : isTestDomain ? ["testnet"  as const, ["testnet"] as const]
    : /* prod */     ["mainnet"  as const, ["mainnet"] as const];

export type SupportedNetwork = typeof supportedNetworks[number];

// === rpc constraints ===

export const RPC_RESULTS_PER_PAGE = isLocalhost() ? 10 : 10;

// === graphql ===

export const getGraphqlUrl = (network: NetworkName) => {
    return `https://sui-${network}.mystenlabs.com/graphql`;
};

// === jsonrpc ===

export const loadNetworkConfig = (network: NetworkName) => ({
    url: loadRpc({
        network,
        supportedRpcs: RPC_ENDPOINTS[network],
        defaultRpc: RPC_ENDPOINTS[network][0],
    })
});

export const RPC_ENDPOINTS: Record<NetworkName, string[]> = {
    "mainnet": [
        getFullnodeUrl("mainnet"),
        "https://mainnet.suiet.app",
        "https://rpc-mainnet.suiscan.xyz",
        "https://mainnet.sui.rpcpool.com",
        "https://sui-mainnet.nodeinfra.com",
        "https://mainnet-rpc.sui.chainbase.online",
        "https://sui-mainnet-ca-1.cosmostation.io",
        "https://sui-mainnet-ca-2.cosmostation.io",
        "https://sui-mainnet-us-1.cosmostation.io",
        "https://sui-mainnet-us-2.cosmostation.io",
    ],
    "testnet": [
        getFullnodeUrl("testnet"),
        "https://rpc-testnet.suiscan.xyz",
        "https://sui-testnet-endpoint.blockvision.org",
        "https://sui-testnet.public.blastapi.io",
        "https://testnet.suiet.app",
        "https://sui-testnet.nodeinfra.com",
        "https://testnet.sui.rpcpool.com",
        "https://sui-testnet-rpc.publicnode.com",
    ],
    "devnet": [
        getFullnodeUrl("devnet"),
    ],
    "localnet": [
        getFullnodeUrl("localnet"),
    ],
};

// === dev ===

export const DEV_LINKED_FOREIGN_ADDRS: Record<LinkNetwork, string[]> = {
    "Ethereum": [
        "0x1111111111111111111111111111111111111AaA",
        "0x2222222222222222222222222222222222222BbB",
        // "0x3333333333333333333333333333333333333CcC",
    ],
    "Solana": [
        "Test111AaaaaaaaaaaaaaaaaaaaaaaaaaaaAaA",
        "Test222BbbbbbbbbbbbbbbbbbbbbbbbbbbbBbB",
        // "Test333CcccccccccccccccccccccccccccCcC",
    ],
};
