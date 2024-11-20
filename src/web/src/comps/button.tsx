import { useAppContext } from "../App";

export const Btn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    working?: boolean;
}> = ({
    onClick,
    children,
    disabled = undefined,
    working = undefined,
}) =>
{
    const { isWorking } = useAppContext();
    working = working || isWorking;
    disabled = disabled || working;

    return (
        <button
            onClick={onClick}
            className={`btn ${working ? "working" : ""}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
