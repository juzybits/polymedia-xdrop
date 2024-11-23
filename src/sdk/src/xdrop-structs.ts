import { SuiObjectResponse } from "@mysten/sui/client";
import { objResToFields } from "@polymedia/suitcase-core";

export type SuiLink = {
    id: string;
    network_address: string;
    timestamp_ms: number;
};

/**
 * positive amount = claimable;
 * 0 amount = already claimed;
 * null amount = not eligible.
 */
export type ClaimableAmount = bigint | null;

export type LinkWithAmount = SuiLink & {
    amount: ClaimableAmount;
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
