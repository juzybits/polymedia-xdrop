import { useInputPrivateKey } from "@polymedia/suitcase-react";

/**
 * Input hook for XDrop admin private key validation.
 */
export function useAdminPrivateKey({
    expectedAddr, label, errorMsg,
}: {
    expectedAddr: string,
    label: string,
    errorMsg: string,
}) {
    return useInputPrivateKey({
        label,
        html: {
            value: String(import.meta.env.VITE_PRIVATE_KEY ?? ""),
            placeholder: "suiprivkey...",
        },
        validateValue: (pk) => {
            if (pk.toSuiAddress() !== expectedAddr) {
                return { err: errorMsg, val: undefined };
            }
            return { err: null, val: pk };
        },
    });
}
