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

const ADMIN: address = @0x777;
const USER_1: address = @0xee1;
const USER_2: address = @0xee2;
const USER_1_ETH: vector<u8> = b"ethereum address 1";
const USER_2_ETH: vector<u8> = b"ethereum address 2";

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
    assert_eq( owned_coin.value(), value );
    transfer::public_transfer(owned_coin, owner);
}

// === tests: end to end ===

#[test]
fun test_end_to_end()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(
        ADMIN,
        vector[ USER_1_ETH, USER_2_ETH ],
        vector[ 100, 200 ],
    );

    // assert initial state
    assert_eq(runner.xdrop.is_paused(), true);
    assert_eq(runner.xdrop.is_open(), false);
    assert_eq(runner.xdrop.is_ended(), false);
    assert_eq(runner.xdrop.admin(), ADMIN);
    assert_eq(runner.xdrop.status(), 0); // XDROP_STATUS_PAUSED
    assert_eq(runner.xdrop.value(), 300);
    assert_eq(runner.xdrop.claims().length(), 2);

    runner.admin_opens_xdrop(ADMIN);

    // user 1 claims
    let link = runner.take_link_ethereum(USER_1);
    runner.user_claims(USER_1, &link);
    runner.assert_owns_coin<DEVCOIN>(USER_1, 100);

    test_utils::destroy(runner);
    test_utils::destroy(link);
}
