#[test_only]
module xdrop::xdrop_tests;

use sui::{
    coin::{Coin, Self},
    sui::{SUI},
    test_scenario::{Self, Scenario},
    test_utils::{Self, assert_eq},
};

use suilink::ethereum::{Ethereum};

use xdrop::xdrop::{Self, XDrop};
use xdrop::devcoin::{Self, DEVCOIN};

// === addresses ===

const ADMIN: address = @0x777;
// const USER_1: address = @0xb1;

// === test runner ===

public struct TestRunner {
    scen: Scenario,
}

fun begin(): TestRunner
{
    let scen = test_scenario::begin(ADMIN);
    return TestRunner { scen }
}

fun begin_with_xdrop(): (TestRunner, XDrop<DEVCOIN, Ethereum>)
{
    let mut runner = begin();
    let xdrop = runner.admin_creates_xdrop(ADMIN);
    return (runner, xdrop)
}

fun begin_with_xdrop_and_coin(): (TestRunner, XDrop<DEVCOIN, Ethereum>)
{
    let (mut runner, xdrop) = begin_with_xdrop();
    devcoin::init_for_testing(runner.scen.ctx());
    return (runner, xdrop)
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

// fun admin_adds_claims(
//     runner: &mut TestRunner,
//     sender: address,
//     xdrop: &mut XDrop<DEVCOIN, Ethereum>,
//     coin: Coin<DEVCOIN>,
// ): &mut XDrop<DEVCOIN, Ethereum> {
//     runner.scen.next_tx(sender);
//     return xdrop::admin_adds_claims(xdrop, coin, runner.scen.ctx())
// }

// === asserts ===

// === tests: ... ===

#[test]
fun test_foo()
{
    let (runner, xdrop) = begin_with_xdrop_and_coin();

    assert_eq(1, 1);
    test_utils::destroy(runner);
    test_utils::destroy(xdrop);
}
