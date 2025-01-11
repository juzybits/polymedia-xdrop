#[test_only]
module xdrop::xdrop_tests;

use sui::{
    coin::{Coin},
    test_scenario::{Self as scen, Scenario},
    test_utils::{assert_eq, destroy},
};
use suilink::{
    ethereum::{Self, Ethereum},
    suilink::{SuiLink},
};
use xdrop::xdrop::{Self, XDrop, CleanerCap, EligibleStatus};
use xdrop::devcoin::{Self, DEVCOIN};

// === addresses ===

const ADMIN: address = @0xaa1;
const ADMIN_2: address = @0xaa2;
const USER_1: address = @0xee1;
const USER_2: address = @0xee2;
const CLEANER: address = @0xee3;
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
    xdrop::init_for_testing(scen.ctx());
    devcoin::init_for_testing(scen.ctx());

    scen.next_tx(sender);

    let cleaner_cap = scen.take_from_sender<CleanerCap>();
    transfer::public_transfer(cleaner_cap, CLEANER);

    let supply = scen.take_from_sender<Coin<DEVCOIN>>();
    let xdrop = xdrop::new<DEVCOIN, Ethereum>(scen.ctx());
    let mut runner = TestRunner { scen, supply, xdrop };

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

fun cleaner_deletes_claims(
    runner: &mut TestRunner,
    sender: address,
    addrs: vector<vector<u8>>,
) {
    runner.scen.next_tx(sender);
    let cleaner_cap = runner.scen.take_from_sender<CleanerCap>();
    xdrop::cleaner_deletes_claims(&cleaner_cap, &mut runner.xdrop, addrs);
    runner.scen.return_to_sender(cleaner_cap);
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

fun assert_eligible_statuses(
    runner: &TestRunner,
    foreign_addrs: vector<vector<u8>>,
    expected_statuses: vector<EligibleStatus>,
) {
    let statuses = runner.xdrop.get_eligible_statuses(foreign_addrs);
    assert_eq( statuses, expected_statuses );
    // redundant but just for 100% test coverage
    assert_eq( statuses[0].eligible(), expected_statuses[0].eligible() );
    assert_eq( statuses[0].claimed(), expected_statuses[0].claimed() );
    assert_eq( statuses[0].amount(), expected_statuses[0].amount() );
}

fun assert_stats(
    runner: &TestRunner,
    expected_addrs_claimed: u64,
    expected_addrs_unclaimed: u64,
    expected_amount_claimed: u64,
    expected_amount_unclaimed: u64,
) {
    let stats = runner.xdrop.stats();
    assert_eq( stats.addrs_claimed(), expected_addrs_claimed );
    assert_eq( stats.addrs_unclaimed(), expected_addrs_unclaimed );
    assert_eq( stats.amount_claimed(), expected_amount_claimed );
    assert_eq( stats.amount_unclaimed(), expected_amount_unclaimed );
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
    let user_1_claim = runner.xdrop.claims().borrow(USER_1_ETH.to_string());
    assert_eq( user_1_claim.amount(), 100 );
    assert_eq( user_1_claim.claimed(), false );
    runner.assert_eligible_statuses(
        vector[USER_1_ETH, USER_2_ETH, RANDO_ETH],
        vector[
            xdrop::new_eligible_status_for_testing(true, 100, false),
            xdrop::new_eligible_status_for_testing(true, 200, false),
            xdrop::new_eligible_status_for_testing(false, 0, false),
        ],
    );
    runner.assert_stats(0, 2, 0, 300);

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
    runner.assert_eligible_statuses(
        vector[USER_1_ETH, USER_2_ETH, RANDO_ETH],
        vector[
            xdrop::new_eligible_status_for_testing(true, 100, true),
            xdrop::new_eligible_status_for_testing(true, 200, false),
            xdrop::new_eligible_status_for_testing(false, 0, false),
        ],
    );
    runner.assert_stats(1, 1, 100, 200);

    // admin pauses xdrop
    runner.admin_pauses_xdrop(ADMIN);
    assert_eq( runner.xdrop.is_paused(), true );
    assert_eq( runner.xdrop.is_open(), false );
    assert_eq( runner.xdrop.is_ended(), false );
    assert_eq( runner.xdrop.status(), 0 ); // XDROP_STATUS_PAUSED

    // admin changes admin address
    runner.admin_sets_admin_address(ADMIN, ADMIN_2);
    assert_eq( runner.xdrop.admin(), ADMIN_2 );

    // admin ends xdrop
    runner.admin_ends_xdrop(ADMIN_2);
    assert_eq( runner.xdrop.is_paused(), false );
    assert_eq( runner.xdrop.is_open(), false );
    assert_eq( runner.xdrop.is_ended(), true );
    assert_eq( runner.xdrop.status(), 2 ); // XDROP_STATUS_ENDED

    // admin 2 reclaims remaining balance
    let coin = runner.admin_reclaims_remaining_balance(ADMIN_2);
    assert_eq( coin.value(), 200 );
    assert_eq( runner.xdrop.value(), 0 );
    runner.assert_stats(1, 1, 100, 200); // unchanged

    destroy(runner);
    destroy(link);
    destroy(coin);
}

// === tests: share ===

#[test]
fun test_share()
{
    let mut runner = begin(ADMIN);
    let xdrop = xdrop::new<DEVCOIN, Ethereum>(runner.scen.ctx());
    xdrop::share(xdrop);

    runner.scen.next_tx(ADMIN);
    let xdrop = runner.scen.take_shared<XDrop<DEVCOIN, Ethereum>>();

    destroy(runner);
    destroy(xdrop);
}

// === tests: admin_adds_claims ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_adds_claims_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(USER_1, vector[USER_1_ETH], vector[100, 200]);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ENDED)]
fun test_admin_adds_claims_e_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100, 200]);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ZERO_LENGTH_VECTOR)]
fun test_admin_adds_claims_e_zero_length_vector()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[], vector[]);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_LENGTH_MISMATCH)]
fun test_admin_adds_claims_e_length_mismatch()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100, 200]);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ZERO_AMOUNT)]
fun test_admin_adds_claims_e_zero_amount()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH, USER_2_ETH], vector[0, 200]);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ADDRESS_ALREADY_ADDED)]
fun test_admin_adds_claims_e_address_already_added()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH, USER_2_ETH], vector[100, 200]);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[300]);
    destroy(runner);
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
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ZERO_LENGTH_ADDRESS)]
fun test_admin_adds_claims_e_zero_length_address()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[b""], vector[100]);
    destroy(runner);
}

// === tests: admin_opens_xdrop ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_opens_xdrop_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_opens_xdrop(USER_1);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_NOT_PAUSED)]
fun test_admin_opens_xdrop_e_not_paused()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_opens_xdrop(ADMIN);
    destroy(runner);
}

// === tests: admin_pauses_xdrop ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_pauses_xdrop_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_pauses_xdrop(USER_1);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_NOT_OPEN)]
fun test_admin_pauses_xdrop_e_not_open()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_pauses_xdrop(ADMIN);
    destroy(runner);
}

// === tests: admin_ends_xdrop ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_ends_xdrop_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(USER_1);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ENDED)]
fun test_admin_ends_xdrop_e_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    destroy(runner);
}

// === tests: admin_reclaims_balance ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_reclaims_balance_e_not_admin()
{
    let mut runner = begin(ADMIN);
    let coin = runner.admin_reclaims_balance(USER_1);
    destroy(runner);
    destroy(coin);
}

#[test, expected_failure(abort_code = xdrop::E_NOT_ENDED)]
fun test_admin_reclaims_balance_e_not_ended()
{
    let mut runner = begin(ADMIN);
    let coin = runner.admin_reclaims_balance(ADMIN);
    destroy(runner);
    destroy(coin);
}

// === tests: admin_sets_admin_address ===

#[test, expected_failure(abort_code = xdrop::E_NOT_ADMIN)]
fun test_admin_sets_admin_address_e_not_admin()
{
    let mut runner = begin(ADMIN);
    runner.admin_sets_admin_address(USER_1, ADMIN_2);
    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_ENDED)]
fun test_admin_sets_admin_address_e_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.admin_sets_admin_address(ADMIN, ADMIN_2);
    destroy(runner);
}

// === tests: user_claims ===

#[test, expected_failure(abort_code = xdrop::E_NOT_OPEN)]
fun test_user_claims_e_not_open()
{
    let mut runner = begin(ADMIN);
    let link = runner.take_link_ethereum(USER_1);
    runner.user_claims(USER_1, &link);
    destroy(runner);
    destroy(link);
}

#[test, expected_failure(abort_code = xdrop::E_ADDRESS_NOT_FOUND)]
fun test_user_claims_e_address_not_found()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100]);
    runner.admin_opens_xdrop(ADMIN);

    let link = runner.take_link_ethereum(USER_2);
    runner.user_claims(USER_2, &link);

    destroy(runner);
    destroy(link);
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

    destroy(runner);
    destroy(link);
}

// === tests: cleaner ===

#[test]
fun test_cleaner_deletes_claims()
{
    let mut runner = begin(ADMIN);

    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH, USER_2_ETH], vector[100, 200]);
    assert_eq( runner.xdrop.claims().length(), 2 );

    runner.admin_ends_xdrop(ADMIN);
    runner.cleaner_deletes_claims(CLEANER, vector[USER_1_ETH, USER_2_ETH]);
    assert_eq( runner.xdrop.claims().length(), 0 );

    destroy(runner);
}

#[test, expected_failure(abort_code = xdrop::E_NOT_ENDED)]
fun test_cleaner_deletes_claims_e_not_ended()
{
    let mut runner = begin(ADMIN);
    runner.admin_adds_claims(ADMIN, vector[USER_1_ETH], vector[100]);
    runner.cleaner_deletes_claims(CLEANER, vector[USER_1_ETH]);
    destroy(runner);
}

#[test, expected_failure(abort_code = sui::dynamic_field::EFieldDoesNotExist)]
fun test_cleaner_deletes_claims_e_address_not_found()
{
    let mut runner = begin(ADMIN);
    runner.admin_ends_xdrop(ADMIN);
    runner.cleaner_deletes_claims(CLEANER, vector[USER_1_ETH]);
    destroy(runner);
}

#[test]
fun test_cleaner_creates_cleaner_cap()
{
    let mut runner = begin(ADMIN);

    runner.scen.next_tx(CLEANER);
    let cap = runner.scen.take_from_sender<CleanerCap>();
    let cap_2 = xdrop::cleaner_creates_cleaner_cap(&cap, runner.scen.ctx());

    destroy(runner);
    destroy(cap);
    destroy(cap_2);
}

#[test]
fun test_cleaner_destroys_cleaner_cap()
{
    let mut runner = begin(ADMIN);

    runner.scen.next_tx(CLEANER);
    let cap = runner.scen.take_from_sender<CleanerCap>();
    xdrop::cleaner_destroys_cleaner_cap(cap);

    destroy(runner);
}

// === tests: init ===

#[test]
fun test_init_for_testing()
{
    let mut runner = begin(ADMIN);
    xdrop::init_for_testing(runner.scen.ctx());

    runner.scen.next_tx(ADMIN);
    let cleaner_cap = runner.scen.take_from_sender<CleanerCap>();

    destroy(runner);
    destroy(cleaner_cap);
}
