import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  outline: "btn-outline"
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  leftIcon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className = "",
  disabled = false,
  leftIcon,
  loading = false,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const mergedClassName =
    `btn ${variantClassMap[variant]} ${sizeClassMap[size]}${loading ? " is-loading" : ""}` +
    `${className ? ` ${className}` : ""}`;

  return (
    <button
      aria-disabled={loading || disabled}
      className={mergedClassName}
      disabled={loading || disabled}
      type={type}
      {...props}
    >
      {leftIcon ? <span className="btn-icon">{leftIcon}</span> : null}
      {loading ? "Lädt..." : children}
    </button>
  );
}
