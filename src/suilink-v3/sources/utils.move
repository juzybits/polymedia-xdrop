module suilink::utils
{
    friend suilink::registry_v2;

    public fun bytes_to_hex(bytes: vector<u8>): std::string::String {
        let hex_chars = b"0123456789abcdef";
        let result = b"0x";
        let i = 0;

        while (i < std::vector::length<u8>(&bytes)) {
            let byte = *std::vector::borrow<u8>(&bytes, i);
            std::vector::push_back<u8>(
                &mut result,
                *std::vector::borrow<u8>(&hex_chars, ((byte >> 4) as u64))
            );
            std::vector::push_back<u8>(
                &mut result,
                *std::vector::borrow<u8>(&hex_chars, ((byte & 15) as u64))
            );
            i = i + 1;
        };
        std::string::utf8(result)
    }

    public(friend) fun hash_registry_entry(
        chain_id: u32,
        addr: address,
        network_addr: std::string::String
    ): vector<u8> {
        let data = std::vector::empty<vector<u8>>();
        let data_ref = &mut data;
        std::vector::push_back<vector<u8>>(data_ref, sui::bcs::to_bytes<u32>(&chain_id));
        std::vector::push_back<vector<u8>>(data_ref, hash_sui_address_and_network_address(addr, network_addr));

        let serialized = sui::bcs::to_bytes<vector<vector<u8>>>(&data);
        sui::hash::blake2b256(&serialized)
    }

    public(friend) fun hash_sui_address_and_network_address(
        addr: address,
        network_addr: std::string::String
    ): vector<u8> {
        let data = std::vector::empty<vector<u8>>();
        let data_ref = &mut data;
        std::vector::push_back<vector<u8>>(data_ref, sui::bcs::to_bytes<address>(&addr));
        std::vector::push_back<vector<u8>>(data_ref, *std::string::as_bytes(&network_addr));

        let serialized = sui::bcs::to_bytes<vector<vector<u8>>>(&data);
        sui::hash::blake2b256(&serialized)
    }

    public fun hex_to_base58(input: vector<u8>): std::string::String {
        let base58_chars = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        let remaining = input;
        let output = b"";

        while (!std::vector::is_empty<u8>(&remaining)) {
            let remainder = 0;
            let temp = b"";
            let i = 0;

            while (i < std::vector::length<u8>(&remaining)) {
                let value = (*std::vector::borrow<u8>(&remaining, i) as u64) + remainder * 256;
                let quotient = value / 58;
                remainder = value % 58;

                if (!std::vector::is_empty<u8>(&temp) || quotient > 0) {
                    std::vector::push_back<u8>(&mut temp, (quotient as u8));
                };
                i = i + 1;
            };
            std::vector::push_back<u8>(&mut output, *std::vector::borrow<u8>(&base58_chars, (remainder as u64)));
            remaining = temp;
        };

        let reversed = b"";
        let len = std::vector::length<u8>(&output);
        while (len > 0) {
            let pos = len - 1;
            len = pos;
            std::vector::push_back<u8>(&mut reversed, *std::vector::borrow<u8>(&output, pos));
        };
        std::string::utf8(reversed)
    }

    public fun hex_to_bytes(hex_str: std::string::String): vector<u8> {
        let hex_chars = b"0123456789abcdef";
        let hex_bytes = std::string::as_bytes(&hex_str);
        let result = b"";
        let i = 2;  // Skip "0x" prefix

        while (i < std::vector::length<u8>(hex_bytes)) {
            let high = *std::vector::borrow<u8>(hex_bytes, i);
            let low = *std::vector::borrow<u8>(hex_bytes, i + 1);

            let (_, high_val) = std::vector::index_of<u8>(&hex_chars, &high);
            let (_, low_val) = std::vector::index_of<u8>(&hex_chars, &low);

            assert!(high_val >= 0 && low_val >= 0, 0);
            std::vector::push_back<u8>(&mut result, ((high_val << 4) as u8) | (low_val as u8));
            i = i + 2;
        };
        result
    }

    public(friend) fun migration_hash_registry_entry(
        chain_id: u32,
        old_hash: vector<u8>
    ): vector<u8> {
        let data = std::vector::empty<vector<u8>>();
        let data_ref = &mut data;
        std::vector::push_back<vector<u8>>(data_ref, sui::bcs::to_bytes<u32>(&chain_id));
        std::vector::push_back<vector<u8>>(data_ref, old_hash);

        let serialized = sui::bcs::to_bytes<vector<vector<u8>>>(&data);
        sui::hash::blake2b256(&serialized)
    }
}
