import { bcs } from "@mysten/sui/bcs";
import { SuiObjectResponse } from "@mysten/sui/client";
import { objResToFields } from "@polymedia/suitcase-core";

export type SuiLink = {
    id: string;
    network_address: string;
    timestamp_ms: number;
};

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

export type LinkWithStatus = SuiLink & {
    status: ClaimStatus;
};

/* eslint-disable */
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
/* eslint-enable */
