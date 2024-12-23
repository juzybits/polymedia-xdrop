export type SubmitRes =
    { ok: true | undefined } |
    { ok: false; err: string };

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
