import { useAppContext } from "../App";

export const Btn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    working?: boolean;
    className?: string;
}> = ({
    onClick,
    children,
    disabled = undefined,
    working = undefined,
    className = undefined,
}) =>
{
    const { isWorking } = useAppContext();
    working = working || isWorking;
    disabled = disabled || working;

    return (
        <button
            onClick={onClick}
            className={`btn ${working ? "working" : ""} ${className ?? ""}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
