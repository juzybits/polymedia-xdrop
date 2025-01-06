import { Link } from "react-router-dom";
import { Glitch } from "./glitch";

export const HeroBanner: React.FC<{
    title: string;
    subtitle?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    extra?: React.ReactNode;
}> = ({ title, subtitle, description, actions, extra }) => {
    return (
        <div className="hero-banner">
            <Glitch text={title} />
            {subtitle && (
                <div className="hero-subtitle">
                    <h1>{subtitle}</h1>
                </div>
            )}
            {description && (
                <div className="hero-description">
                    <p>
                        {description}
                    </p>
                </div>
            )}
            {actions && (
                <div className="hero-actions">
                    {actions}
                </div>
            )}
            {extra}
        </div>
    );
};
