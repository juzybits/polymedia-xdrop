import { useInputPrivateKey } from "@polymedia/suitcase-react";

/**
 * Input hook for XDrop admin private key validation.
 */
export function useAdminPrivateKey(adminAddr: string)
{
    return useInputPrivateKey({
        label: "Admin private key (optional, DYOR 🚨):",
        html: {
            value: String(import.meta.env.VITE_PRIVATE_KEY ?? ""),
            placeholder: "suiprivkey...",
        },
        validateValue: (pk) => {
            if (pk.toSuiAddress() !== adminAddr) {
                return { err: "Admin private key does not match XDrop admin.", val: undefined };
            }
            return { err: null, val: pk };
        },
    });
}
