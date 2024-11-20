#[test_only]
module xdrop::xdrop_tests;

use sui::{
    coin::{Coin, Self},
    sui::{SUI},
    test_scenario::{Self as scen, Scenario},
    test_utils::{Self, assert_eq},
};

use suilink::{
    ethereum::{Ethereum},
    suilink::{Self, SuiLink},
};

use xdrop::xdrop::{Self, XDrop};
use xdrop::devcoin::{Self, DEVCOIN};

// === addresses ===

const ADMIN: address = @0x777;
const USER_1: address = @0xee1;
// const USER_2: address = @0xee2;
const USER_1_ETH: vector<u8> = b"ethereum address 1";
const USER_2_ETH: vector<u8> = b"ethereum address 2";

// === test runner ===

public struct TestRunner {
    scen: Scenario,
}

fun begin(): TestRunner
{
    let scen = scen::begin(ADMIN);
    return TestRunner { scen }
}

fun begin_with_xdrop(): TestRunner
{
    let mut runner = begin();
    let xdrop = runner.admin_creates_xdrop(ADMIN);
    transfer::public_share_object(xdrop);
    return runner
}

fun begin_with_xdrop_and_coin(): TestRunner
{
    let mut runner = begin_with_xdrop();
    devcoin::init_for_testing(runner.scen.ctx());
    return runner
}

// === helpers for sui modules ===

public fun mint_sui(
    runner: &mut TestRunner,
    sender: address,
    value: u64,
): Coin<SUI> {
    runner.scen.next_tx(sender);
    return coin::mint_for_testing<SUI>(value, runner.scen.ctx())
}

// === helpers for xdrop module ===

fun admin_creates_xdrop(
    runner: &mut TestRunner,
    sender: address,
): XDrop<DEVCOIN, Ethereum> {
    runner.scen.next_tx(sender);
    return xdrop::admin_creates_xdrop<DEVCOIN, Ethereum>(runner.scen.ctx())
}

fun admin_adds_claims(
    runner: &mut TestRunner,
    sender: address,
    addrs: vector<vector<u8>>,
    amounts: vector<u64>,
) {
    runner.scen.next_tx(sender);

    let mut xdrop = runner.scen.take_shared<XDrop<DEVCOIN, Ethereum>>();
    let mut coin_supply = runner.scen.take_from_sender<Coin<DEVCOIN>>();

    let total_amount = amounts.fold!(0, |acc, val| acc + val);
    let coin_chunk = coin_supply.split(total_amount, runner.scen.ctx());
    xdrop.admin_adds_claims(coin_chunk, addrs, amounts, runner.scen.ctx());

    runner.scen.return_to_sender(coin_supply);
    scen::return_shared(xdrop);
}

fun admin_opens_xdrop(
    runner: &mut TestRunner,
    sender: address,
) {
    runner.scen.next_tx(sender);
    let mut xdrop = runner.scen.take_shared<XDrop<DEVCOIN, Ethereum>>();
    xdrop.admin_opens_xdrop(runner.scen.ctx());
    scen::return_shared(xdrop);
}

fun user_claims(
    runner: &mut TestRunner,
    sender: address,
    link: &SuiLink<Ethereum>,
) {
    runner.scen.next_tx(sender);
    let mut xdrop = runner.scen.take_shared<XDrop<DEVCOIN, Ethereum>>();

    let coin_claimed = xdrop.user_claims(link, runner.scen.ctx());
    transfer::public_transfer(coin_claimed, sender);

    scen::return_shared(xdrop);
}

// === asserts ===

public fun assert_owns_coin<C>(
    runner: &mut TestRunner,
    owner: address,
    value: u64,
) {
    runner.scen.next_tx(owner);
    let paid_coin = runner.scen.take_from_sender<Coin<C>>();
    assert_eq( paid_coin.value(), value );
    transfer::public_transfer(paid_coin, owner);
}

// === tests: ... ===

#[test]
fun test_end_to_end()
{
    let mut runner = begin_with_xdrop_and_coin();

    runner.admin_adds_claims(
        ADMIN,
        vector[ USER_1_ETH, USER_2_ETH ],
        vector[ 100, 200 ],
    );

    runner.scen.next_tx(ADMIN);
    let xdrop = runner.scen.take_shared<XDrop<DEVCOIN, Ethereum>>();
    assert_eq(xdrop.is_paused(), true);
    assert_eq(xdrop.is_open(), false);
    assert_eq(xdrop.is_ended(), false);
    assert_eq(xdrop.admin(), ADMIN);
    assert_eq(xdrop.status(), 0); // XDROP_STATUS_PAUSED
    assert_eq(xdrop.value(), 300);
    assert_eq(xdrop.claims().length(), 2);
    scen::return_shared(xdrop);

    runner.admin_opens_xdrop(ADMIN);

    runner.scen.next_tx(USER_1);
    suilink::mint_for_testing<Ethereum>(USER_1, USER_1_ETH.to_string(), 0, runner.scen.ctx());
    runner.scen.next_tx(USER_1);
    let link = runner.scen.take_from_sender<SuiLink<Ethereum>>();
    runner.user_claims(USER_1, &link);
    runner.assert_owns_coin<DEVCOIN>(USER_1, 100);

    test_utils::destroy(runner);
    test_utils::destroy(link);
}
