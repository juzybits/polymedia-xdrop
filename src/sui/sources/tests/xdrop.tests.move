#[test_only]
module xdrop::xdrop_tests;

use sui::{
    coin::{Coin, Self},
    sui::{SUI},
    test_scenario::{Self as scen, Scenario},
    test_utils::{Self, assert_eq},
};

use suilink::ethereum::{Ethereum};

use xdrop::xdrop::{Self, XDrop};
use xdrop::devcoin::{Self, DEVCOIN};

// === addresses ===

const ADMIN: address = @0x777;
// const USER_1_SUI: address = @0xee1;
// const USER_2_SUI: address = @0xee2;
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
    let total_amount = amounts.fold!(0, |acc, val| acc + val);
    let mut coin_supply = runner.scen.take_from_sender<Coin<DEVCOIN>>();
    let coin_chunk = coin_supply.split(total_amount, runner.scen.ctx());
    let mut xdrop = runner.scen.take_shared<XDrop<DEVCOIN, Ethereum>>();
    xdrop.admin_adds_claims(coin_chunk, addrs, amounts, runner.scen.ctx());
    scen::return_shared(xdrop);
    runner.scen.return_to_sender(coin_supply);
}

// === asserts ===

// === tests: ... ===

#[test]
fun test_foo()
{
    let mut runner = begin_with_xdrop_and_coin();

    runner.admin_adds_claims(
        ADMIN,
        vector[ USER_1_ETH, USER_2_ETH ],
        vector[ 100, 200 ],
    );

    assert_eq(1, 1);
    test_utils::destroy(runner);
}
