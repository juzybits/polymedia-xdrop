module suilink::registry_v2
{
    friend suilink::ethereum;
    friend suilink::solana;

    struct SuiLinkRegistryV2 has key {
        id: sui::object::UID,
        version: u8,
        registry: sui::bag::Bag,
    }

    struct RecordsV1 has copy, drop, store {
        dummy_field: bool,
    }

    public(friend) fun mint<T0>(
        registry: &mut SuiLinkRegistryV2,
        network_address: std::string::String,
        clock: &sui::clock::Clock,
        chain_id: u32,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let records = RecordsV1 { dummy_field: false };
        assert!(!sui::dynamic_field::exists_<RecordsV1>(&registry.id, records), 2);
        assert!(registry.version == 3, 1);

        let sender = sui::tx_context::sender(ctx);
        let registry_entry = suilink::utils::hash_registry_entry(chain_id, sender, network_address);
        assert!(!sui::bag::contains<vector<u8>>(&registry.registry, registry_entry), 0);

        sui::bag::add<vector<u8>, bool>(&mut registry.registry, registry_entry, true);
        suilink::suilink::transfer<T0>(
            suilink::suilink::mint<T0>(network_address, sui::clock::timestamp_ms(clock), ctx),
            sender
        );
    }

    public fun admin_burn<T0>(
        registry: &mut SuiLinkRegistryV2,
        _admin_cap: &suilink::suilink::AdminCap,
        receiving: sui::transfer::Receiving<suilink::suilink::SuiLink<T0>>
    ) {
        suilink::suilink::destroy<T0>(
            suilink::suilink::transfer_receive<T0>(&mut registry.id, receiving)
        );
    }

    public fun create_from_v1(
        old_registry: suilink::suilink::SuiLinkRegistry,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let new_id = sui::object::new(ctx);
        let records = RecordsV1 { dummy_field: false };

        sui::dynamic_field::add<RecordsV1, vector<vector<u8>>>(
            &mut new_id,
            records,
            sui::vec_set::into_keys<vector<u8>>(suilink::suilink::destroy_registry(old_registry))
        );

        let new_registry = SuiLinkRegistryV2 {
            id: new_id,
            version: 3,
            registry: sui::bag::new(ctx),
        };
        sui::transfer::share_object<SuiLinkRegistryV2>(new_registry);
    }

    public fun delete<T0>(
        registry: &mut SuiLinkRegistryV2,
        link: suilink::suilink::SuiLink<T0>,
        chain_id: u32,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(registry.version == 3, 1);

        sui::bag::remove<vector<u8>, bool>(
            &mut registry.registry,
            suilink::utils::hash_registry_entry(
                chain_id,
                sui::tx_context::sender(ctx),
                suilink::suilink::network_address<T0>(&link)
            )
        );

        suilink::suilink::nullify_network_address<T0>(&mut link);
        suilink::suilink::nullify_timestamp_ms<T0>(&mut link);
        suilink::suilink::transfer<T0>(link, sui::object::uid_to_address(&registry.id));
    }

    public fun migrate_records(registry: &mut SuiLinkRegistryV2) {
        let records = RecordsV1 { dummy_field: false };
        assert!(sui::dynamic_field::exists_<RecordsV1>(&registry.id, records), 3);

        let records = RecordsV1 { dummy_field: false };
        let old_records = sui::dynamic_field::borrow_mut<RecordsV1, vector<vector<u8>>>(&mut registry.id, records);
        let count = 0;

        while (!std::vector::is_empty<vector<u8>>(old_records) && count <= 250) {
            let record = std::vector::pop_back<vector<u8>>(old_records);
            sui::bag::add<vector<u8>, bool>(
                &mut registry.registry,
                suilink::utils::migration_hash_registry_entry(0, record),
                true
            );
            sui::bag::add<vector<u8>, bool>(
                &mut registry.registry,
                suilink::utils::migration_hash_registry_entry(1, record),
                true
            );
            count = count + 1;
        };

        if (std::vector::is_empty<vector<u8>>(old_records)) {
            let records = RecordsV1 { dummy_field: false };
            sui::dynamic_field::remove<RecordsV1, vector<vector<u8>>>(&mut registry.id, records);
        };
    }

    public fun update_version(registry: &mut SuiLinkRegistryV2) {
        if (3 > registry.version) {
            registry.version = 3;
        };
    }
}
