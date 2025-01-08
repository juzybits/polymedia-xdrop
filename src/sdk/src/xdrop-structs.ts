import { bcs } from "@mysten/sui/bcs";
import { SuiObjectResponse } from "@mysten/sui/client";
import { objResToFields, objResToType } from "@polymedia/suitcase-core";
import { LinkNetwork, suiLinkNetworkTypeToName } from "./suilink.js";

// === xdrop structs ===

/**
 * A Sui xdrop::XDrop object
 */
export type XDrop = {
    type_coin: string;
    type_network: string;
    id: string;
    admin: string;
    status: XDropStatus;
    balance: bigint;
    claims_length: number;
    stats: XDropStats;
    // helpers
    is_open: boolean;
    is_paused: boolean;
    is_ended: boolean;
    network_name: LinkNetwork;
};

/**
 * A subset of `XDrop` with only the fields needed for function calls.
 */
export type XDropIdentifier = Pick<XDrop, "type_coin" | "type_network" | "id">;

export type XDropStatus = "paused" | "open" | "ended";

export const ClaimStatusBcs = bcs.struct("ClaimStatus", {
    addr: bcs.String,
    eligible: bcs.Bool,
    amount: bcs.U64,
    claimed: bcs.Bool,
});

// typeof ClaimStatusBcs.$inferType; // doesn't work well: `(property) status: any`
export type ClaimStatus = {
    addr: string;
    eligible: boolean;
    amount: bigint;
    claimed: boolean;
};

export const XDropStatsBcs = bcs.struct("XDropStats", {
    addrs_claimed: bcs.U64,
    addrs_unclaimed: bcs.U64,
    amount_claimed: bcs.U64,
    amount_unclaimed: bcs.U64,
});

export type XDropStats = {
    addrs_claimed: number;
    addrs_unclaimed: number;
    amount_claimed: bigint;
    amount_unclaimed: bigint;
};

// === suilink structs ===

export type SuiLink = {
    id: string;
    network_address: string;
    timestamp_ms: number;
};

export type LinkWithStatus = SuiLink & {
    status: ClaimStatus;
};

// === parsers ===

/* eslint-disable */
export function objResToXDrop(
    resp: SuiObjectResponse,
): XDrop | null
{
    let fields: Record<string, any>;
    let objType: string;
    try {
        fields = objResToFields(resp);
        objType = objResToType(resp);
    } catch (_err) {
        return null;
    }

    let status: XDropStatus;
    if (fields.status === 0) { status = "paused"; }
    else if (fields.status === 1) { status = "open"; }
    else if (fields.status === 2) { status = "ended"; }
    else { throw new Error(`[objResToXDrop] Unknown status: ${fields.status}`); }

    const type_coin = objType.match(/<([^,>]+)/)?.[1] || "";
    const type_network = objType.match(/,\s*([^>]+)>/)?.[1] || "";
    return {
        type_coin,
        type_network,
        id: fields.id.id,
        admin: fields.admin,
        status: status,
        balance: BigInt(fields.balance),
        claims_length: Number(fields.claims.fields.size),
        stats: {
            addrs_claimed: Number(fields.stats.fields.addrs_claimed),
            addrs_unclaimed: Number(fields.stats.fields.addrs_unclaimed),
            amount_claimed: BigInt(fields.stats.fields.amount_claimed),
            amount_unclaimed: BigInt(fields.stats.fields.amount_unclaimed),
        },
        // helpers
        is_open: status === "open",
        is_paused: status === "paused",
        is_ended: status === "ended",
        network_name: suiLinkNetworkTypeToName(type_network),
    };
}

export function objResToSuiLink(
    resp: SuiObjectResponse,
): SuiLink
{
    const fields = objResToFields(resp);
    return {
        id: fields.id.id,
        network_address: fields.network_address,
        timestamp_ms: fields.timestamp_ms,
    };
}

export function retValToClaimStatus(
    retVal: any,
): ClaimStatus
{
    return {
        addr: retVal.addr,
        eligible: retVal.eligible,
        amount: BigInt(retVal.amount),
        claimed: retVal.claimed,
    };
}
/* eslint-enable */
