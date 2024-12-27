import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { isTxKind, ObjChangeKind, txResToData } from "@polymedia/suitcase-core";
import { XDropIdentifier } from "./xdrop-structs";

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
}

/**
 * Parse a transaction that shares an XDrop and returns the XDropIdentifier.
 */
export const parseTxAdminSharesXDrop = ( // TODO
    resp: SuiTransactionBlockResponse,
    xdropPkgId: string,
): XDropIdentifier | null =>
{
    let txData: ReturnType<typeof txResToData>;
    try { txData = txResToData(resp); }
    catch (_err) { return null; }
    if (resp.effects?.status.status !== "success") { return null; }

    // console.log("================");
    // console.log(JSON.stringify(resp, null, 2));

    for (const tx of txData.txs)
    {
        if (!isTxKind(tx, "MoveCall") ||
            tx.MoveCall.package !== xdropPkgId ||
            tx.MoveCall.module !== "xdrop" ||
            tx.MoveCall.function !== "share" ||
            !tx.MoveCall.arguments ||
            !tx.MoveCall.type_arguments
        ) continue;
        console.log(JSON.stringify(tx, null, 2));

    }
    return null;
}
