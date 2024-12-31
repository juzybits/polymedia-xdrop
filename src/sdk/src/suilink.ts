// === SuiLink ===

export const LINK_NETWORKS = ["Ethereum", "Solana"] as const;

export type LinkNetwork = (typeof LINK_NETWORKS)[number];

/**
 * Get the type of a SuiLink object. E.g. `0x123::suilink::SuiLink<0x123::solana::Solana>`
 */
export function getSuiLinkType(
    pkgId: string,
    network: LinkNetwork,
): string
{
    const networkType = getSuiLinkNetworkType(pkgId, network);
    return `${pkgId}::suilink::SuiLink<${networkType}>`;
}

/**
 * Get the network type of a SuiLink object. E.g. `0x123::solana::Solana`
 */
export function getSuiLinkNetworkType(
    pkgId: string,
    network: LinkNetwork,
): string
{
    if (network === "Ethereum") return `${pkgId}::ethereum::Ethereum`;
    if (network === "Solana") return `${pkgId}::solana::Solana`;
    throw new Error(`Unsupported network: ${network}`);
}

export function suiLinkNetworkTypeToName(
    networkType: string,
): LinkNetwork
{
    if (networkType.endsWith("::Ethereum")) return "Ethereum";
    if (networkType.endsWith("::Solana")) return "Solana";
    throw new Error(`Unsupported network: ${networkType}`);
}

// === foreign network addresses ===

/**
 * Normalize a foreign network address to the format used by SuiLink.
 * This is crucial when adding claims to an XDrop.
 */
export function normalizeNetworkAddr(network: LinkNetwork, addr: string): string {
    if (network === "Ethereum") {
        return addr.toLowerCase();
    }
    if (network === "Solana") {
        return addr;
    }
    throw new Error(`Unsupported network: ${network}`);
}

/**
 * Validate a (non-normalized) foreign network address.
 */
export function validateNetworkAddr(network: LinkNetwork, addr: string) {
    if (network === "Ethereum") {
        if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
            throw new Error(`Invalid Ethereum address: ${addr}`);
        }
        return;
    }
    if (network === "Solana") {
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) {
            throw new Error(`Invalid Solana address: ${addr}`);
        }
        return;
    }
    throw new Error(`Unsupported network: ${network}`);
}

/**
 * Validate and normalize a foreign network address.
 */
export function validateAndNormalizeNetworkAddr(network: LinkNetwork, addr: string): string {
    validateNetworkAddr(network, addr);
    return normalizeNetworkAddr(network, addr);
}
