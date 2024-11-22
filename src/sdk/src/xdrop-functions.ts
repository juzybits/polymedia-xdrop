import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { NestedResult, ObjectInput, objectArg } from "@polymedia/suitcase-core";

/**
 * Build transactions for the xdrop::xdrop Sui module.
 */
export const XDropModule =
{
    // === admin functions ===

    admin_creates_xdrop: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        info_json: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_creates_xdrop`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                tx.pure.string(info_json),
            ],
        });
    },

    admin_adds_claims: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
        coin: ObjectInput,
        addrs: string[],
        amounts: bigint[],
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_adds_claims`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
                objectArg(tx, coin),
                tx.pure.vector("string", addrs),
                tx.pure.vector("u64", amounts),
            ],
        });
    },

    admin_sets_admin_address: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
        new_admin: string,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_sets_admin_address`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
                tx.pure.address(new_admin),
            ],
        });
    },

    admin_opens_xdrop: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_opens_xdrop`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
            ],
        });
    },

    admin_pauses_xdrop: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_pauses_xdrop`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
            ],
        });
    },

    admin_ends_xdrop: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_ends_xdrop`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
            ],
        });
    },

    admin_reclaims_balance: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::admin_reclaims_balance`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
            ],
        });
    },

    // === user functions ===

    user_claims: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
        link: ObjectInput,
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::user_claims`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
                objectArg(tx, link),
            ],
        });
    },

    // === devinspect functions ===

    get_claimable_amounts: (
        tx: Transaction,
        packageId: string,
        type_coin: string,
        type_network: string,
        xdrop: ObjectInput,
        addrs: string[],
    ): TransactionResult =>
    {
        return tx.moveCall({
            target: `${packageId}::xdrop::get_claimable_amounts`,
            typeArguments: [ type_coin, type_network ],
            arguments: [
                objectArg(tx, xdrop),
                tx.pure.vector("string", addrs),
            ],
        });
    },
};
