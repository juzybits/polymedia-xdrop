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

use xdrop::xdrop::{Self, XDrop, ClaimStatus};
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
    supply: Coin<DEVCOIN>,
    xdrop: XDrop<DEVCOIN, Ethereum>,
}

fun begin(
    sender: address,
): TestRunner
{
    let mut scen = scen::begin(sender);
    devcoin::init_for_testing(scen.ctx());
    scen.next_tx(sender);
    let supply = scen.take_from_sender<Coin<DEVCOIN>>();

    let xdrop = xdrop::admin_creates_xdrop<DEVCOIN, Ethereum>( b"", scen.ctx());
    let mut runner = TestRunner { scen, supply,xdrop };

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

    let total_amount = amounts.fold!(0, |acc, val| acc + val);
    let coin_chunk = runner.supply.split(total_amount, runner.scen.ctx());
    runner.xdrop.admin_adds_claims(coin_chunk, addrs, amounts, runner.scen.ctx());
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

fun admin_reclaims_balance(
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

fun assert_claim_statuses(
    runner: &TestRunner,
    foreign_addrs: vector<vector<u8>>,
    expected_statuses: vector<ClaimStatus>,
) {
    let statuses = runner.xdrop.get_claim_statuses(foreign_addrs);
    assert_eq( statuses, expected_statuses );
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
    runner.assert_claim_statuses(
        vector[USER_1_ETH, USER_2_ETH, RANDO_ETH],
        vector[
            xdrop::new_status_for_testing(true, false, 100),
            xdrop::new_status_for_testing(true, false, 200),
            xdrop::new_status_for_testing(false, false, 0),
        ],
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
    runner.assert_claim_statuses(
        vector[USER_1_ETH, USER_2_ETH, RANDO_ETH],
        vector[
            xdrop::new_status_for_testing(true, true, 100),
            xdrop::new_status_for_testing(true, false, 200),
            xdrop::new_status_for_testing(false, false, 0),
        ],
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

// === tests: admin_adds_claims ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_adds_claims_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(USER_1, vector[USER_1_ETH], vector[100, 200]);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ENDED)]
fun test_admin_adds_claims_e_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100, 200]);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ZERO_LENGTH_VECTOR)]
fun test_admin_adds_claims_e_zero_length_vector()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[], vector[]);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_LENGTH_MISMATCH)]
fun test_admin_adds_claims_e_length_mismatch()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100, 200]);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ZERO_AMOUNT)]
fun test_admin_adds_claims_e_zero_amount()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH, USER_2_ETH], vector[0, 200]);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ADDRESS_ALREADY_ADDED)]
fun test_admin_adds_claims_e_address_already_added()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH, USER_2_ETH], vector[100, 200]);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[300]);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_AMOUNT_MISMATCH)]
fun test_admin_adds_claims_e_amount_mismatch()
{
    let mut runner = begin(ADMIN);
    let total_amount = 299;
    let coin_chunk = runner.supply.split(total_amount, runner.scen.ctx());
    runner.xdrop.admin_adds_claims(
        coin_chunk,
        vector[USER_1_ETH, USER_2_ETH],
        vector[100, 200],
        runner.scen.ctx(),
    );
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ZERO_LENGTH_ADDRESS)]
fun test_admin_adds_claims_e_zero_length_address()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[b""], vector[100]);
    test_utils::destroy(runner);
}

// === tests: admin_opens_xdrop ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_opens_xdrop_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_opens_xdrop(USER_1);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ENDED)]
fun test_admin_opens_xdrop_e_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_opens_xdrop(ADMIN);
    test_utils::destroy(runner);
}

// === tests: admin_pauses_xdrop ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_pauses_xdrop_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_pauses_xdrop(USER_1);
    test_utils::destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ENDED)]
fun test_admin_pauses_xdrop_e_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_pauses_xdrop(ADMIN);
    test_utils::destroy(runner);
}

// === tests: admin_ends_xdrop ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_ends_xdrop_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(USER_1);
    test_utils::destroy(runner);
}

// === tests: admin_reclaims_balance ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_reclaims_balance_e_not_admin()
{
    let mut runner = begin(ADMIN);
    let coin = runner.admin_reclaims_balance(USER_1);
    test_utils::destroy(runner);
    test_utils::destroy(coin);
}

#[test, expected_failure(abort_code = xdrop::E_NOT_ENDED)]
fun test_admin_reclaims_balance_e_not_ended()
{
    let mut runner = begin(ADMIN);
    let coin = runner.admin_reclaims_balance(ADMIN);
    test_utils::destroy(runner);
    test_utils::destroy(coin);
}

// === tests: admin_sets_admin_address ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_sets_admin_address_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_sets_admin_address(USER_1, ADMIN_2);
    test_utils::destroy(runner);
}

// === tests: user_claims ===

#[test, expected_failure(abort_code = xdrop::E_NOT_OPEN)]
fun test_user_claims_e_not_open()
{
    let mut runner = begin(ADMIN);
    let link = runner.take_link_ethereum(USER_1);
    runner.user_claims(USER_1, &link);
    test_utils::destroy(runner);
    test_utils::destroy(link);
}

#[test, expected_failure(abort_code = xdrop::E_ADDRESS_NOT_FOUND)]
fun test_user_claims_e_address_not_found()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100]);
    runner.admin_opens_xdrop(ADMIN);

    let link = runner.take_link_ethereum(USER_2);
    runner.user_claims(USER_2, &link);

    test_utils::destroy(runner);
    test_utils::destroy(link);
}

#[test, expected_failure(abort_code = xdrop::E_ALREADY_CLAIMED)]
fun test_user_claims_e_already_claimed()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100]);
    runner.admin_opens_xdrop(ADMIN);

    let link = runner.take_link_ethereum(USER_1);
    runner.user_claims(USER_1, &link);
    runner.user_claims(USER_1, &link);

    test_utils::destroy(runner);
    test_utils::destroy(link);
}

// === tests: 100% coverage ===

#[test]
fun test_init_for_testing()
{
    let mut runner = begin(ADMIN);
    xdrop::init_for_testing(runner.scen.ctx());
    test_utils::destroy(runner);
}
