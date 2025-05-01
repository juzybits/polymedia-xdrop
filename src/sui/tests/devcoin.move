#[test_only]
module xdrop::devcoin;

use sui::{
    coin::{Self},
};

public struct DEVCOIN has drop {}

fun init(otw: DEVCOIN, ctx: &mut TxContext)
{
    // Create the coin
    let (mut treasury, metadata) = coin::create_currency(
        otw,
        9, // decimals
        b"DEVCOIN", // symbol
        b"DEVCOIN", // name
        b"", // description
        option::none(), // icon_url
        ctx,
    );

    // Freeze the metadata
    transfer::public_freeze_object(metadata);

    // Mint the supply and transfer it to the sender
    let supply = 100_000_000 * 1_000_000_000; // 100 million coins * 9 decimals
    let recipient = tx_context::sender(ctx);
    coin::mint_and_transfer(&mut treasury, supply, recipient, ctx);

    // Fix the supply
    transfer::public_transfer(treasury, @0x0);
}

public fun init_for_testing(ctx: &mut TxContext) {
    init(DEVCOIN {}, ctx);
}
