import { getFullnodeUrl } from "@mysten/sui/client";
import { NetworkName } from "@polymedia/suitcase-core";
import { loadRpc } from "@polymedia/suitcase-react";

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
