#[test_only]
module xdrop::xdrop_tests;

use sui::{
    coin::{Coin},
    test_scenario::{Self as scen, Scenario},
    test_utils::{Self, assert_eq},
};

use suilink::{
    ethereum::{Self, Ethereum},
    suilink::{SuiLink},
};

use xdrop::xdrop::{Self, XDrop};
use xdrop::devcoin::{Self, DEVCOIN};

// === addresses ===

const ADMIN: address = @0xaa1;
const ADMIN_2: address = @0xaa2;
const USER_1: address = @0xee1;
const USER_2: address = @0xee2;
const USER_1_ETH: vector<u8> = b"ethereum address 1";
const USER_2_ETH: vector<u8> = b"ethereum address 2";
const RANDO_ETH: vector<u8> = b"ethereum rando";

// === test runner ===

public struct TestRunner {
    scen: Scenario,
    xdrop: XDrop<DEVCOIN, Ethereum>,
}

fun begin(
    sender: address,
): TestRunner
{
    let mut scen = scen::begin(sender);
    let xdrop = xdrop::admin_creates_xdrop<DEVCOIN, Ethereum>(scen.ctx(), b"");
    let mut runner = TestRunner { scen, xdrop };

    devcoin::init_for_testing(runner.scen.ctx());

    runner.dev_link_ethereum(USER_1, USER_1_ETH); // changes next_tx(sender)
    runner.dev_link_ethereum(USER_2, USER_2_ETH);

    runner.scen.next_tx(ADMIN);

    return runner
}

// === helpers for suilink module ===

fun dev_link_ethereum(
    runner: &mut TestRunner,
    sender: address,
    foreign_addr: vector<u8>,
) {
    runner.scen.next_tx(sender);
    ethereum::dev_link(sender, foreign_addr.to_string(), runner.scen.ctx());
}

fun take_link_ethereum(
    runner: &mut TestRunner,
    sender: address,
): SuiLink<Ethereum> {
    runner.scen.next_tx(sender);
    return runner.scen.take_from_sender<SuiLink<Ethereum>>()
}

// === helpers for xdrop module ===

fun admin_adds_claims(
    runner: &mut TestRunner,
    sender: address,
    addrs: vector<vector<u8>>,
    amounts: vector<u64>,
) {
    runner.scen.next_tx(sender);

    let mut coin_supply = runner.scen.take_from_sender<Coin<DEVCOIN>>();

    let total_amount = amounts.fold!(0, |acc, val| acc + val);
    let coin_chunk = coin_supply.split(total_amount, runner.scen.ctx());
    runner.xdrop.admin_adds_claims(coin_chunk, addrs, amounts, runner.scen.ctx());

    runner.scen.return_to_sender(coin_supply);
}

fun admin_opens_xdrop(
    runner: &mut TestRunner,
    sender: address,
) {
    runner.scen.next_tx(sender);
    runner.xdrop.admin_opens_xdrop(runner.scen.ctx());
}

fun admin_pauses_xdrop(
    runner: &mut TestRunner,
    sender: address,
) {
    runner.scen.next_tx(sender);
    runner.xdrop.admin_pauses_xdrop(runner.scen.ctx());
}

fun admin_ends_xdrop(
    runner: &mut TestRunner,
    sender: address,
) {
    runner.scen.next_tx(sender);
    runner.xdrop.admin_ends_xdrop(runner.scen.ctx());
}

fun admin_reclaims_remaining_balance(
    runner: &mut TestRunner,
    sender: address,
): Coin<DEVCOIN> {
    runner.scen.next_tx(sender);
    return runner.xdrop.admin_reclaims_balance(runner.scen.ctx())
}

fun admin_sets_admin_address(
    runner: &mut TestRunner,
    sender: address,
    new_admin: address,
) {
    runner.scen.next_tx(sender);
    runner.xdrop.admin_sets_admin_address(new_admin, runner.scen.ctx());
}

fun user_claims(
    runner: &mut TestRunner,
    sender: address,
    link: &SuiLink<Ethereum>,
) {
    runner.scen.next_tx(sender);
    let coin_claimed = runner.xdrop.user_claims(link, runner.scen.ctx());
    transfer::public_transfer(coin_claimed, sender);
}

// === asserts ===

fun assert_owns_coin<C>(
    runner: &mut TestRunner,
    owner: address,
    value: u64,
) {
    runner.scen.next_tx(owner);
    let owned_coin = runner.scen.take_from_sender<Coin<C>>();
    assert_eq(  owned_coin.value(), value );
    transfer::public_transfer(owned_coin, owner);
}

fun assert_claimable_amounts(
    runner: &TestRunner,
    foreign_addrs: vector<vector<u8>>,
    expected_amounts: vector<Option<u64>>,
) {
    let actual_amounts = runner.xdrop.get_claimable_amounts(foreign_addrs);
    assert_eq( actual_amounts, expected_amounts );
}

// === tests: end to end ===

#[test]
fun test_end_to_end()
{
    // admin creates xdrop, adds claims
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(
        ADMIN,
        vector[ USER_1_ETH, USER_2_ETH ],
        vector[ 100, 200 ],
    );
    assert_eq( runner.xdrop.is_paused(), true );
    assert_eq( runner.xdrop.is_open(), false );
    assert_eq( runner.xdrop.is_ended(), false );
    assert_eq( runner.xdrop.admin(), ADMIN );
    assert_eq( runner.xdrop.status(), 0 ); // XDROP_STATUS_PAUSED
    assert_eq( runner.xdrop.value(), 300 );
    assert_eq( runner.xdrop.claims().length(), 2 );
    runner.assert_claimable_amounts(
        vector[USER_1_ETH, USER_2_ETH, RANDO_ETH],
        vector[option::some(100), option::some(200), option::none()],
    );

    // admin opens xdrop
    runner.admin_opens_xdrop(ADMIN);
    assert_eq( runner.xdrop.is_paused(), false );
    assert_eq( runner.xdrop.is_open(), true );
    assert_eq( runner.xdrop.is_ended(), false );
    assert_eq( runner.xdrop.status(), 1 ); // XDROP_STATUS_OPEN

    // user 1 claims
    let link = runner.take_link_ethereum(USER_1);
    runner.user_claims(USER_1, &link);
    runner.assert_owns_coin<DEVCOIN>(USER_1, 100);
    assert_eq( runner.xdrop.value(), 200 );
    runner.assert_claimable_amounts(
        vector[USER_1_ETH, USER_2_ETH, RANDO_ETH],
        vector[option::some(0), option::some(200), option::none()],
    );

    // admin pauses xdrop
    runner.admin_pauses_xdrop(ADMIN);
    assert_eq( runner.xdrop.is_paused(), true );
    assert_eq( runner.xdrop.is_open(), false );
    assert_eq( runner.xdrop.is_ended(), false );
    assert_eq( runner.xdrop.status(), 0 ); // XDROP_STATUS_PAUSED

    // admin ends xdrop
    runner.admin_ends_xdrop(ADMIN);
    assert_eq( runner.xdrop.is_paused(), false );
    assert_eq( runner.xdrop.is_open(), false );
    assert_eq( runner.xdrop.is_ended(), true );
    assert_eq( runner.xdrop.status(), 2 ); // XDROP_STATUS_ENDED

    // admin changes admin address
    runner.admin_sets_admin_address(ADMIN, ADMIN_2);
    assert_eq( runner.xdrop.admin(), ADMIN_2 );

    // admin 2 reclaims remaining balance
    let coin = runner.admin_reclaims_remaining_balance(ADMIN_2);
    assert_eq( coin.value(), 200 );
    assert_eq( runner.xdrop.value(), 0 );

    test_utils::destroy(runner);
    test_utils::destroy(link);
    test_utils::destroy(coin);
}
