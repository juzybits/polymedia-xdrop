module xdrop::xdrop;

// == imports ==

use std::{
    string::{String},
};
use sui::{
    balance::{Self, Balance},
    coin::{Self, Coin},
    package::{Self},
    table::{Self, Table},
};
use suilink::suilink::{SuiLink};

// == errors ==

const E_ADDRESS_NOT_FOUND: u64 = 3000;
const E_ALREADY_CLAIMED: u64 = 3001;
const E_NOT_ADMIN: u64 = 3002;
const E_LENGTH_MISMATCH: u64 = 3003;
const E_ADDRESS_ALREADY_ADDED: u64 = 3004;
const E_ZERO_AMOUNT: u64 = 3005;
const E_AMOUNT_MISMATCH: u64 = 3006;

// === constants ===

// === structs ===

public struct XDROP has drop {}

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

public fun admin_adds_claims<C, N>(
    xdrop: &mut XDrop<C, N>,
    coin: Coin<C>,
    mut addrs: vector<vector<u8>>,
    mut amounts: vector<u64>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( addrs.length() == amounts.length(), E_LENGTH_MISMATCH );

    let mut total_amount = 0;
    while (addrs.length() > 0)
    {
        let addr = addrs.pop_back().to_string();
        assert!( !xdrop.claims.contains(addr), E_ADDRESS_ALREADY_ADDED );

        let amount = amounts.pop_back();
        assert!( amount > 0, E_ZERO_AMOUNT );
        total_amount = total_amount + amount;

        let claim = Claim {
            amount: amount,
            claimed: false,
        };
        xdrop.claims.add(addr, claim);
    };

    assert!( total_amount == coin.value(), E_AMOUNT_MISMATCH );

    coin::put(&mut xdrop.balance, coin);
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

fun init(otw: XDROP, ctx: &mut TxContext)
{
    let publisher = package::claim(otw, ctx);
    transfer::public_transfer(publisher, ctx.sender());
}

// === test functions ===
