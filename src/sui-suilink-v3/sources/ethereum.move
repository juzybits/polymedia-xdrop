module suilink::ethereum
{
    struct Ethereum has drop {
        dummy_field: bool,
    }

    public fun ethereum(_admin_cap: &suilink::suilink::AdminCap): Ethereum {
        Ethereum { dummy_field: false }
    }

    fun ecrecover_eth_address(
        signature: vector<u8>,
        message: vector<u8>
    ): vector<u8> {
        let v_byte = std::vector::borrow_mut<u8>(&mut signature, 64);

        // Normalize the v value of the signature
        if (*v_byte == 27) {
            *v_byte = 0;
        } else if (*v_byte == 28) {
            *v_byte = 1;
        } else if (*v_byte > 35) {
            *v_byte = (*v_byte - 1) % 2;
        };

        // Recover the public key
        let pub_key = sui::ecdsa_k1::secp256k1_ecrecover(&signature, &message, 0);
        let decompressed_key = sui::ecdsa_k1::decompress_pubkey(&pub_key);

        // Extract the uncompressed public key (skip first byte)
        let uncompressed = b"";
        let i = 1;
        while (i < 65) {
            std::vector::push_back<u8>(
                &mut uncompressed,
                *std::vector::borrow<u8>(&decompressed_key, i)
            );
            i = i + 1;
        };

        // Hash the public key and take last 20 bytes
        let hashed = sui::hash::keccak256(&uncompressed);
        let eth_address = b"";
        let i = 12;
        while (i < 32) {
            std::vector::push_back<u8>(
                &mut eth_address,
                *std::vector::borrow<u8>(&hashed, i)
            );
            i = i + 1;
        };
        eth_address
    }

    #[allow(unused_type_parameter)]
    public fun link<T0>(
        _registry: &mut suilink::suilink::SuiLinkRegistry,
        _signature: vector<u8>,
        _clock: &sui::clock::Clock,
        _ctx: &mut sui::tx_context::TxContext
    ) {
        abort 1
    }

    public fun link_v2(
        _registry: &mut suilink::registry_v2::SuiLinkRegistryV2,
        _signature: vector<u8>,
        _clock: &sui::clock::Clock,
        _ctx: &mut sui::tx_context::TxContext
    ) {
        abort 1
    }

    public fun link_v3(
        registry: &mut suilink::registry_v2::SuiLinkRegistryV2,
        signature: vector<u8>,
        clock: &sui::clock::Clock,
        eth_address: std::string::String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Construct the message to verify
        let message = std::string::utf8(x"19457468657265756d205369676e6564204d6573736167653a0a32393757656c636f6d6520746f205375694c696e6b210a0a53696d706c79207369676e2074686973206d65737361676520746f20636f6e6e65637420796f757220457468657265756d206164647265737320746f20796f75722053756920616464726573732e204974277320717569636b20616e64207365637572652c20706c7573206e6f207472616e73616374696f6e206f722067617320666565732e0a0a457468657265756d20616464726573733a20");
        std::string::append_utf8(&mut message, *std::string::as_bytes(&eth_address));

        let sui_prefix = std::string::utf8(x"0a53756920416464726573733a203078");
        std::string::append_utf8(&mut message, *std::string::as_bytes(&sui_prefix));

        let sui_address = sui::address::to_string(sui::tx_context::sender(ctx));
        std::string::append_utf8(&mut message, *std::string::as_bytes(&sui_address));

        // Verify the signature matches the ethereum address
        assert!(
            eth_address == suilink::utils::bytes_to_hex(
                ecrecover_eth_address(signature, *std::string::as_bytes(&message))
            ),
            0
        );

        // Mint the SuiLink NFT
        suilink::registry_v2::mint<Ethereum>(
            registry,
            eth_address,
            clock,
            0, // Chain ID for Ethereum
            ctx
        );
    }

    // == juzy's additions ===

    /// intentionally not test_only
    /// allows minting of arbitrary links for development
    public fun dev_link(
        recipient: address,
        eth_address: std::string::String,
        ctx: &mut sui::tx_context::TxContext
    ) {
        suilink::suilink::dev_link<Ethereum>(recipient, eth_address, 0, ctx);
    }
}
