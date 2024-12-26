export type SubmitRes =
    { ok: undefined } |          // no action yet
    { ok: true } |               // success
    { ok: false; err: null } |   // error that we can ignore like "Rejected from user"
    { ok: false; err: string };  // error

export const ResultMsg: React.FC<{
    res: SubmitRes;
}> = ({
    res,
}) => {
    return <>
        <SuccessMsg res={res} />
        <ErrorMsg res={res} />
    </>;
};

export const SuccessMsg: React.FC<{
    res: SubmitRes;
    msg?: string;
}> = ({
    res,
    msg = "Success!",
}) => {
    if (res.ok !== true) return null;
    return <div className="success center-element center-text">{msg}</div>;
};

export const ErrorMsg: React.FC<{
    res: SubmitRes;
}> = ({
    res,
}) => {
    if (res.ok !== false || res.err !== null) return null;
    return <div className="error center-element center-text">{res.err}</div>;
};
