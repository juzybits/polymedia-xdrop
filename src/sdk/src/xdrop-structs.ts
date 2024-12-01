import { bcs } from "@mysten/sui/bcs";
import { SuiObjectResponse } from "@mysten/sui/client";
import { objResToFields, objResToType } from "@polymedia/suitcase-core";

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
};

export type XDropStatus = "paused" | "open" | "ended";

export const ClaimStatusBcs = bcs.struct("ClaimStatus", {
    eligible: bcs.Bool,
    claimed: bcs.Bool,
    amount: bcs.U64,
});

// typeof ClaimStatusBcs.$inferType; // doesn't work well: `(property) status: any`
export type ClaimStatus = {
    eligible: boolean;
    claimed: boolean;
    amount: bigint;
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
    else { throw new Error(`Unknown status: ${fields.status}`); }

    return {
        type_coin: objType.match(/<([^,>]+)/)?.[1] || "",
        type_network: objType.match(/,\s*([^>]+)>/)?.[1] || "",
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
        eligible: retVal.eligible,
        claimed: retVal.claimed,
        amount: BigInt(retVal.amount),
    };
}
/* eslint-enable */
