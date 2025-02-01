module suilink::solana
{
    struct Solana has drop {
        dummy_field: bool,
    }

    public fun solana(_admin_cap: &suilink::suilink::AdminCap): Solana {
        Solana { dummy_field: false }
    }

    #[allow(unused_type_parameter)]
    public fun link<T0>(
        _registry: &mut suilink::suilink::SuiLinkRegistry,
        _signature: vector<u8>,
        _clock: &sui::clock::Clock,
        _pubkey: vector<u8>,
        _ctx: &mut sui::tx_context::TxContext
    ) {
        abort 1
    }

    public fun link_v2(
        registry: &mut suilink::registry_v2::SuiLinkRegistryV2,
        signature: vector<u8>,
        clock: &sui::clock::Clock,
        pubkey: vector<u8>,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Convert the Solana public key to base58 format
        let solana_address = suilink::utils::hex_to_base58(pubkey);

        // Construct the message to verify
        let message = std::string::utf8(
            x"57656c636f6d6520746f205375694c696e6b210a0a53696d706c79207369676e2074686973206d65737361676520746f20636f6e6e65637420796f757220536f6c616e61206164647265737320746f20796f75722053756920616464726573732e204974277320717569636b20616e64207365637572652c20706c7573206e6f207472616e73616374696f6e206f722067617320666565732e0a0a536f6c616e6120616464726573733a20"
        );
        std::string::append_utf8(&mut message, *std::string::as_bytes(&solana_address));

        let sui_prefix = std::string::utf8(x"0a53756920416464726573733a203078");
        std::string::append_utf8(&mut message, *std::string::as_bytes(&sui_prefix));

        let sui_address = sui::address::to_string(sui::tx_context::sender(ctx));
        std::string::append_utf8(&mut message, *std::string::as_bytes(&sui_address));

        // Verify the ed25519 signature
        assert!(
            sui::ed25519::ed25519_verify(&signature, &pubkey, std::string::as_bytes(&message)),
            0
        );

        // Mint the SuiLink NFT
        suilink::registry_v2::mint<Solana>(
            registry,
            solana_address,
            clock,
            1, // Chain ID for Solana
            ctx
        );
    }

    // == juzy's additions ===

    /// intentionally not test_only
    /// allows minting of arbitrary links for development
    public fun dev_link(
        recipient: address,
        sol_address: std::string::String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        suilink::suilink::dev_link<Solana>(recipient, sol_address, 0, ctx);
    }
}
