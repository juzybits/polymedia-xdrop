module xdrop::xdrop;

// == imports ==

use std::{
    string::{String},
};
use sui::{
    balance::{Self, Balance},
    coin::{Self, Coin},
    table::{Self, Table},
};
use suilink::suilink::{SuiLink};

// == errors ==

const E_ADDRESS_NOT_FOUND: u64 = 3000;
const E_ALREADY_CLAIMED: u64 = 3001;
const E_NOT_ADMIN: u64 = 3002;

// === constants ===

// === structs ===

/// XDrop manages coin distributions across chains, allowing users to claim coins
/// on Sui based on ownership proofs from other networks (e.g., Ethereum, Solana).
///
/// C: The type of coin being distributed.
/// N: The source network where ownership was verified.
public struct XDrop<phantom C, phantom N> has key, store {
    id: UID,
    admin: address,
    /// whether the xdrop can be claimed
    open: bool,
    /// total balance remaining in the xdrop
    balance: Balance<C>,
    /// keys are addresses in the foreign network
    claims: Table<String, Claim>,
}

public struct Claim has store {
    amount: u64,
    claimed: bool,
}

// === admin functions ===

public fun admin_creates_xdrop<C, N>(
    ctx: &mut TxContext,
): XDrop<C, N> {
    XDrop {
        id: object::new(ctx),
        admin: ctx.sender(),
        open: false,
        balance: balance::zero(),
        claims: table::new(ctx),
    }
}

public fun admin_opens_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    xdrop.open = true;
}

public fun admin_closes_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    xdrop.open = false;
}

public fun admin_sets_admin_address<C, N>(
    xdrop: &mut XDrop<C, N>,
    new_admin: address,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    xdrop.admin = new_admin;
}

// === user functions ===

public fun user_claims<C, N>(
    xdrop: &mut XDrop<C, N>,
    suilink: &SuiLink<N>,
    ctx: &mut TxContext,
): Coin<C>
{
    let addr = suilink.network_address();
    assert!( xdrop.claims.contains(addr), E_ADDRESS_NOT_FOUND );

    let claim = xdrop.claims.borrow_mut(addr);
    assert!( !claim.claimed, E_ALREADY_CLAIMED );

    claim.claimed = true;

    return coin::take(&mut xdrop.balance, claim.amount, ctx)
}

// === private functions ===

// === accessors ===

public fun admin<C, N>(xdrop: &XDrop<C, N>): address { xdrop.admin }
public fun open<C, N>(xdrop: &XDrop<C, N>): bool { xdrop.open }
public fun value<C, N>(xdrop: &XDrop<C, N>): u64 { xdrop.balance.value() }
public fun claims<C, N>(xdrop: &XDrop<C, N>): &Table<String, Claim> { &xdrop.claims }

// === initialization ===

// === test functions ===
