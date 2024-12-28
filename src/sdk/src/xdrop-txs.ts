import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { ObjChangeKind } from "@polymedia/suitcase-core";

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
