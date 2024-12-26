// === SuiLink ===

export const LINK_NETWORKS = ["ethereum", "solana"] as const;

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
    const moduleAndStruct = network === "ethereum" ? "ethereum::Ethereum" : "solana::Solana";
    return `${pkgId}::${moduleAndStruct}`;
}

export function suiLinkNetworkTypeToName(
    networkType: string,
): LinkNetwork
{
    if (networkType.endsWith("::Ethereum")) return "ethereum";
    if (networkType.endsWith("::Solana")) return "solana";
    throw new Error("Unsupported network");
}
