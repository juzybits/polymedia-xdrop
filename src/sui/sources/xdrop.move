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
const E_ZERO_LENGTH: u64 = 3006;
const E_AMOUNT_MISMATCH: u64 = 3007;
const E_ENDED: u64 = 3008;
const E_NOT_ENDED: u64 = 3009;
const E_NOT_OPEN: u64 = 3010;

// === constants ===

const XDROP_STATUS_PAUSED: u8 = 0;
const XDROP_STATUS_OPEN: u8 = 1;
const XDROP_STATUS_ENDED: u8 = 2;

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
    /// 0: paused - users cannot claim
    /// 1: open - users can claim
    /// 2: ended - ended permanently (users can never claim again; admin can reclaim balance)
    status: u8,
    /// total balance remaining in the xdrop
    balance: Balance<C>,
    /// keys are addresses in the foreign network
    claims: Table<String, Claim>,
    /// Application-specific details (name, description, project URL, etc)
    info_json: String,
}

public struct Claim has store {
    amount: u64,
    claimed: bool,
}

// === admin functions ===

public fun admin_creates_xdrop<C, N>(
    ctx: &mut TxContext,
    info_json: vector<u8>,
): XDrop<C, N> {
    XDrop {
        id: object::new(ctx),
        admin: ctx.sender(),
        status: XDROP_STATUS_PAUSED,
        balance: balance::zero(),
        claims: table::new(ctx),
        info_json: info_json.to_string(),
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
    assert!( !xdrop.is_ended(), E_ENDED );
    assert!( addrs.length() == amounts.length(), E_LENGTH_MISMATCH );
    assert!( addrs.length() > 0, E_ZERO_LENGTH );

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
    assert!( !xdrop.is_ended(), E_ENDED );
    xdrop.status = XDROP_STATUS_OPEN;
}

public fun admin_pauses_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( !xdrop.is_ended(), E_ENDED );
    xdrop.status = XDROP_STATUS_PAUSED;
}

public fun admin_ends_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    xdrop.status = XDROP_STATUS_ENDED;
}

public fun admin_reclaims_balance<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
): Coin<C>
{
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( xdrop.is_ended(), E_NOT_ENDED );

    let value = xdrop.balance.value();
    return coin::take(&mut xdrop.balance, value, ctx)
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
    link: &SuiLink<N>,
    ctx: &mut TxContext,
): Coin<C>
{
    assert!( xdrop.is_open(), E_NOT_OPEN );

    let addr = link.network_address();
    assert!( xdrop.claims.contains(addr), E_ADDRESS_NOT_FOUND );

    let claim = xdrop.claims.borrow_mut(addr);
    assert!( !claim.claimed, E_ALREADY_CLAIMED );

    claim.claimed = true;

    return coin::take(&mut xdrop.balance, claim.amount, ctx)
}

// === devinspect functions ===

public fun get_claimable_amounts<C, N>(
    xdrop: &XDrop<C, N>,
    addrs: vector<vector<u8>>,
): vector<Option<u64>>
{
    let mut amounts = vector::empty<Option<u64>>();
    let mut i = 0;
    let len = addrs.length();
    while (i < len)
    {
        let addr = (*addrs.borrow(i)).to_string();
        if (!xdrop.claims.contains(addr)) {
            vector::push_back(&mut amounts, option::none());
        } else {
            let claim = xdrop.claims.borrow(addr);
            vector::push_back(
                &mut amounts,
                if (claim.claimed) option::some(0) else option::some(claim.amount),
            );
        };
        i = i + 1;
    };
    amounts
}

// === helpers ===

public fun is_paused<C, N>(xdrop: &XDrop<C, N>): bool { xdrop.status == XDROP_STATUS_PAUSED }
public fun is_open<C, N>(xdrop: &XDrop<C, N>): bool { xdrop.status == XDROP_STATUS_OPEN }
public fun is_ended<C, N>(xdrop: &XDrop<C, N>): bool { xdrop.status == XDROP_STATUS_ENDED }

// === accessors ===

public fun admin<C, N>(xdrop: &XDrop<C, N>): address { xdrop.admin }
public fun status<C, N>(xdrop: &XDrop<C, N>): u8 { xdrop.status }
public fun value<C, N>(xdrop: &XDrop<C, N>): u64 { xdrop.balance.value() }
public fun claims<C, N>(xdrop: &XDrop<C, N>): &Table<String, Claim> { &xdrop.claims }

// === initialization ===

fun init(otw: XDROP, ctx: &mut TxContext)
{
    let publisher = package::claim(otw, ctx);
    transfer::public_transfer(publisher, ctx.sender());
}

// === test functions ===
