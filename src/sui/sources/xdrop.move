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

// === constants ===

// === structs ===

/// XDrop manages coin distributions across chains, allowing users to claim coins
/// on Sui based on ownership proofs from other networks (e.g., Ethereum, Solana).
///
/// C: The type of coin being distributed.
/// N: The source network where ownership was verified.
public struct XDrop<phantom C, phantom N> has key, store {
    id: UID,
    /// total balance left in the xdrop
    balance: Balance<C>,
    /// keys are addresses in the foreign network
    claims: Table<String, Claim>,
}

public struct Claim has store {
    amount: u64,
    claimed: bool,
}

// === public-mutative functions ===

public fun new<C, N>(
    ctx: &mut TxContext,
): XDrop<C, N> {
    XDrop {
        id: object::new(ctx),
        balance: balance::zero(),
        claims: table::new(ctx),
    }
}

public fun claim<C, N>(
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

// === public-view status helpers ===

// === public-view accessors: auction ===

// === public-view accessors: config ===

// === initialization ===

// === test functions ===
