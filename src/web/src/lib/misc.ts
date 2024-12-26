export type SubmitRes =
    { ok: undefined } |          // no action yet
    { ok: true } |               // success
    { ok: false; err: null } |   // error that we can ignore like "Rejected from user"
    { ok: false; err: string };  // error

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
