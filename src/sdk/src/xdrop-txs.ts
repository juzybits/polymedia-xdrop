import { SuiTransactionBlockResponse } from "@mysten/sui/client";

import { chunkArray, ObjChangeKind } from "@polymedia/suitcase-core";

import { MAX_OBJECTS_PER_TX } from "./xdrop-client.js";

/**
 * Extract the created XDrop object (if any) from `SuiTransactionBlockResponse.objectChanges`.
 */
export const extractXDropObjCreated = (
    resp: SuiTransactionBlockResponse,
    xdropPkgId: string,
): ObjChangeKind<"created"> | undefined =>
{
    return resp.objectChanges?.find(o =>
        o.type === "created" && o.objectType.startsWith(`${xdropPkgId}::xdrop::XDrop<`)
    ) as ObjChangeKind<"created"> | undefined;
};

/**
 * Calculate fee amount for a given set of claims.
 *
 * Fee must be calculated per-transaction, as bigint division
 * truncates the fee applied on each tx which can lead to
 * slightly different totals than simply calculating fee on the total amount.
 *
 * @param claims Set of claims
 * @param bps Basis points
 */
export const calculateFee = (
    claims: { amount: bigint }[],
    bps: bigint,
): bigint => {
    return chunkArray(claims, MAX_OBJECTS_PER_TX)
        .reduce((totalFee, batch) => {
            const batchTotal = batch.reduce((sum, claim) => sum + claim.amount, 0n);
            return totalFee + (batchTotal * bps / 10000n);
        }, 0n);
};
