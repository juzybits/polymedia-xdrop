module xdrop::xdrop;

// === imports ===

use std::{
    ascii::{String as AsciiString},
    string::{String},
    type_name::{Self},
};
use sui::{
    balance::{Self, Balance},
    coin::{Self, Coin},
    event::{emit},
    package::{Self},
    table::{Self, Table},
};
use suilink::suilink::{SuiLink};

// === errors ===

const E_ADDRESS_NOT_FOUND: u64 = 3000;
const E_ALREADY_CLAIMED: u64 = 3001;
const E_NOT_ADMIN: u64 = 3002;
const E_LENGTH_MISMATCH: u64 = 3003;
const E_ADDRESS_ALREADY_ADDED: u64 = 3004;
const E_ZERO_AMOUNT: u64 = 3005;
const E_ZERO_LENGTH_VECTOR: u64 = 3006;
const E_AMOUNT_MISMATCH: u64 = 3007;
const E_ENDED: u64 = 3008;
const E_NOT_ENDED: u64 = 3009;
const E_NOT_OPEN: u64 = 3010;
const E_NOT_PAUSED: u64 = 3011;
const E_ZERO_LENGTH_ADDRESS: u64 = 3012;

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
public struct XDrop<phantom C, phantom N> has key {
    id: UID,
    admin: address,
    /// 0: paused - users cannot claim
    /// 1: open - users can claim
    /// 2: ended - ended permanently (users can never claim again; admin can reclaim balance)
    status: u8,
    /// total balance remaining in the xdrop
    balance: Balance<C>,
    /// keys are addresses in the foreign network (e.g. Solana)
    claims: Table<String, Claim>,
    /// claimed/unclaimed addresses and amounts
    stats: Stats,
}

/// How much a foreign address can claim from an XDrop, and whether it has been claimed.
public struct Claim has store {
    amount: u64,
    claimed: bool,
}

/// Aggregate XDrop statistics. For viewing purposes.
public struct Stats has store {
    addrs_claimed: u64,
    addrs_unclaimed: u64,
    amount_claimed: u64,
    amount_unclaimed: u64,
}

/// Whether a foreign address is eligible for an XDrop. For viewing purposes.
public struct EligibleStatus has copy, drop, store {
    eligible: bool,
    amount: u64,
    claimed: bool,
}

/// Allows removing entries from XDrop.claims after an XDrop has ended.
public struct CleanerCap has key, store {
    id: UID,
}

// === initialization ===

fun init(otw: XDROP, ctx: &mut TxContext)
{
    let publisher = package::claim(otw, ctx);
    transfer::public_transfer(publisher, ctx.sender());

    let cleaner_cap = CleanerCap {
        id: object::new(ctx),
    };
    transfer::transfer(cleaner_cap, ctx.sender());
}

// === admin functions ===

public fun new<C, N>(
    ctx: &mut TxContext,
): XDrop<C, N> {
    XDrop {
        id: object::new(ctx),
        admin: ctx.sender(),
        status: XDROP_STATUS_PAUSED,
        balance: balance::zero(),
        claims: table::new(ctx),
        stats: Stats {
            addrs_claimed: 0,
            addrs_unclaimed: 0,
            amount_claimed: 0,
            amount_unclaimed: 0,
        },
    }
}

public fun share<C, N>(
    xdrop: XDrop<C, N>,
) {
    emit(EventShare {
        id: xdrop.id.to_address(),
        type_coin: type_name::get<C>().into_string(),
        type_network: type_name::get<N>().into_string(),
    });
    transfer::share_object(xdrop);
}

/// `addrs` are addresses in the foreign network
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
    assert!( addrs.length() > 0, E_ZERO_LENGTH_VECTOR );

    let addrs_length = addrs.length();
    let mut total_amount = 0;
    while (addrs.length() > 0)
    {
        let addr = addrs.pop_back().to_string();
        assert!( addr.length() > 0, E_ZERO_LENGTH_ADDRESS );
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

    xdrop.stats.addrs_unclaimed = xdrop.stats.addrs_unclaimed + addrs_length;
    xdrop.stats.amount_unclaimed = xdrop.stats.amount_unclaimed + total_amount;
}

public fun admin_opens_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( xdrop.is_paused(), E_NOT_PAUSED );
    xdrop.status = XDROP_STATUS_OPEN;
    emit(EventOpen {
        id: xdrop.id.to_address(),
        type_coin: type_name::get<C>().into_string(),
        type_network: type_name::get<N>().into_string(),
    });
}

public fun admin_pauses_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( xdrop.is_open(), E_NOT_OPEN );
    xdrop.status = XDROP_STATUS_PAUSED;
    emit(EventPause {
        id: xdrop.id.to_address(),
        type_coin: type_name::get<C>().into_string(),
        type_network: type_name::get<N>().into_string(),
    });
}

public fun admin_ends_xdrop<C, N>(
    xdrop: &mut XDrop<C, N>,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( !xdrop.is_ended(), E_ENDED );
    xdrop.status = XDROP_STATUS_ENDED;
    emit(EventEnd {
        id: xdrop.id.to_address(),
        type_coin: type_name::get<C>().into_string(),
        type_network: type_name::get<N>().into_string(),
    });
}

public fun admin_sets_admin_address<C, N>(
    xdrop: &mut XDrop<C, N>,
    new_admin: address,
    ctx: &mut TxContext,
) {
    assert!( ctx.sender() == xdrop.admin, E_NOT_ADMIN );
    assert!( !xdrop.is_ended(), E_ENDED );
    xdrop.admin = new_admin;
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

// === user functions ===

public fun user_claims<C, N>(
    xdrop: &mut XDrop<C, N>,
    link: &SuiLink<N>,
    ctx: &mut TxContext,
): Coin<C>
{
    assert!( xdrop.is_open(), E_NOT_OPEN );

    let addr = link.network_address(); // the user address in the foreign network
    assert!( xdrop.claims.contains(addr), E_ADDRESS_NOT_FOUND );

    let claim = xdrop.claims.borrow_mut(addr);
    assert!( !claim.claimed, E_ALREADY_CLAIMED );

    claim.claimed = true;

    xdrop.stats.addrs_claimed = xdrop.stats.addrs_claimed + 1;
    xdrop.stats.addrs_unclaimed = xdrop.stats.addrs_unclaimed - 1;
    xdrop.stats.amount_claimed = xdrop.stats.amount_claimed + claim.amount;
    xdrop.stats.amount_unclaimed = xdrop.stats.amount_unclaimed - claim.amount;

    emit(EventClaim {
        id: xdrop.id.to_address(),
        type_coin: type_name::get<C>().into_string(),
        type_network: type_name::get<N>().into_string(),
        foreign_addr: addr,
        amount: claim.amount,
    });

    return coin::take(&mut xdrop.balance, claim.amount, ctx)
}

// === cleaner functions ===

public fun cleaner_deletes_claims<C, N>(
    _: &CleanerCap,
    xdrop: &mut XDrop<C, N>,
    mut addrs: vector<vector<u8>>,
) {
    assert!( xdrop.is_ended(), E_NOT_ENDED );
    while (addrs.length() > 0) {
        let addr = addrs.pop_back().to_string();
        let claim = xdrop.claims.remove(addr);
        let Claim { .. } = claim;
    };
}

public fun cleaner_creates_cleaner_cap(
    _: &CleanerCap,
    ctx: &mut TxContext,
): CleanerCap {
    CleanerCap {
        id: object::new(ctx),
    }
}

public fun cleaner_destroys_cleaner_cap(
    cap: CleanerCap,
) {
    let CleanerCap { id } = cap;
    object::delete(id);
}

// === view functions ===

public fun get_eligible_statuses<C, N>(
    xdrop: &XDrop<C, N>,
    addrs: vector<vector<u8>>,
): vector<EligibleStatus>
{
    let mut amounts = vector::empty<EligibleStatus>();
    let mut i = 0;
    let len = addrs.length();
    while (i < len)
    {
        let addr = (*addrs.borrow(i)).to_string();
        if (!xdrop.claims.contains(addr)) {
            vector::push_back(
                &mut amounts,
                EligibleStatus {
                    eligible: false,
                    amount: 0,
                    claimed: false,
            });
        } else {
            let claim = xdrop.claims.borrow(addr);
            vector::push_back(
                &mut amounts,
                EligibleStatus {
                    eligible: true,
                    amount: claim.amount,
                    claimed: claim.claimed,
                },
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
public fun stats<C, N>(xdrop: &XDrop<C, N>): &Stats { &xdrop.stats }

public fun claim_amount(claim: &Claim): u64 { claim.amount }
public fun claim_claimed(claim: &Claim): bool { claim.claimed }
public use fun claim_amount as Claim.amount;
public use fun claim_claimed as Claim.claimed;

public fun addrs_claimed(stats: &Stats): u64 { stats.addrs_claimed }
public fun addrs_unclaimed(stats: &Stats): u64 { stats.addrs_unclaimed }
public fun amount_claimed(stats: &Stats): u64 { stats.amount_claimed }
public fun amount_unclaimed(stats: &Stats): u64 { stats.amount_unclaimed }

public fun eligible(status: &EligibleStatus): bool { status.eligible }
public fun claimed(status: &EligibleStatus): bool { status.claimed }
public fun amount(status: &EligibleStatus): u64 { status.amount }

// === events ===

public struct EventShare has drop, copy {
    id: address,
    type_coin: AsciiString,
    type_network: AsciiString,
}

public struct EventOpen has drop, copy {
    id: address,
    type_coin: AsciiString,
    type_network: AsciiString,
}

public struct EventPause has drop, copy {
    id: address,
    type_coin: AsciiString,
    type_network: AsciiString,
}

public struct EventEnd has drop, copy {
    id: address,
    type_coin: AsciiString,
    type_network: AsciiString,
}

public struct EventClaim has drop, copy {
    id: address,
    type_coin: AsciiString,
    type_network: AsciiString,
    foreign_addr: String,
    amount: u64,
}

// === test functions ===

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(XDROP {}, ctx);
}

#[test_only]
public fun new_eligible_status_for_testing(
    eligible: bool,
    amount: u64,
    claimed: bool,
): EligibleStatus {
    EligibleStatus { eligible, amount, claimed }
}
