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
