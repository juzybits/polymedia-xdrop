module suilink::suilink
{
    friend suilink::registry_v2;
    friend suilink::utils;

    struct SUILINK has drop {}

    struct SuiLink<phantom T0> has key {
        id: sui::object::UID,
        network_address: std::string::String,
        timestamp_ms: u64,
    }

    struct AdminCap has store, key {
        id: sui::object::UID,
    }

    struct SuiLinkRegistry has key {
        id: sui::object::UID,
        registry: sui::vec_set::VecSet<vector<u8>>,
    }

    public fun delete<T0>(
        _registry: &mut SuiLinkRegistry,
        _link: SuiLink<T0>,
        _ctx: &mut sui::tx_context::TxContext
    ) {
        abort 0
    }

    public(friend) fun transfer<T0>(
        link: SuiLink<T0>,
        recipient: address
    ) {
        sui::transfer::transfer<SuiLink<T0>>(link, recipient);
    }

    public(friend) fun destroy<T0>(link: SuiLink<T0>): std::string::String {
        let SuiLink {
            id,
            network_address,
            timestamp_ms: _,
        } = link;
        sui::object::delete(id);
        network_address
    }

    public(friend) fun destroy_registry(registry: SuiLinkRegistry): sui::vec_set::VecSet<vector<u8>> {
        let SuiLinkRegistry {
            id,
            registry: registry_set,
        } = registry;
        sui::object::delete(id);
        registry_set
    }

    fun init(
        witness: SUILINK,
        ctx: &mut sui::tx_context::TxContext
    ) {
        sui::package::claim_and_keep<SUILINK>(witness, ctx);

        let admin_cap = AdminCap {
            id: sui::object::new(ctx)
        };
        sui::transfer::public_transfer<AdminCap>(admin_cap, sui::tx_context::sender(ctx));

        let registry = SuiLinkRegistry {
            id: sui::object::new(ctx),
            registry: sui::vec_set::empty<vector<u8>>(),
        };
        sui::transfer::share_object<SuiLinkRegistry>(registry);
    }

    public(friend) fun mint<T0>(
        network_address: std::string::String,
        timestamp_ms: u64,
        ctx: &mut sui::tx_context::TxContext
    ): SuiLink<T0> {
        SuiLink<T0> {
            id: sui::object::new(ctx),
            network_address,
            timestamp_ms,
        }
    }

    public fun network_address<T0>(link: &SuiLink<T0>): std::string::String {
        link.network_address
    }

    public(friend) fun nullify_network_address<T0>(link: &mut SuiLink<T0>) {
        link.network_address = std::string::utf8(b"");
    }

    public(friend) fun nullify_timestamp_ms<T0>(link: &mut SuiLink<T0>) {
        link.timestamp_ms = 0;
    }

    public fun timestamp_ms<T0>(link: &SuiLink<T0>): u64 {
        link.timestamp_ms
    }

    public(friend) fun transfer_receive<T0>(
        uid: &mut sui::object::UID,
        receiving: sui::transfer::Receiving<SuiLink<T0>>
    ): SuiLink<T0> {
        sui::transfer::receive<SuiLink<T0>>(uid, receiving)
    }

    // == juzy's additions ===

    /// intentionally not test_only
    /// allows minting of arbitrary links for development
    public fun dev_link<T0>(
        recipient: address,
        network_address: std::string::String,
        timestamp_ms: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let link = SuiLink<T0> {
            id: sui::object::new(ctx),
            network_address,
            timestamp_ms,
        };
        transfer(link, recipient);
    }
}
