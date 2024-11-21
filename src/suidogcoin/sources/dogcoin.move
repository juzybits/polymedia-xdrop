module dogcoin::dogcoin;

use sui::{
    coin::{Self},
    url,
};

public struct DOGCOIN has drop {}

fun init(otw: DOGCOIN, ctx: &mut TxContext)
{
    // Create the coin
    let (mut treasury, metadata) = coin::create_currency(
        otw,
        9, // decimals
        b"DOGCOIN", // symbol
        b"DOGCOIN", // name
        b"", // description
        option::some(url::new_unsafe_from_bytes(b"https://i.pinimg.com/736x/04/8b/8d/048b8dbc061a104f266176b1b7bf828c.jpg")), // icon_url
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
