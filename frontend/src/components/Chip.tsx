import type { HTMLAttributes } from "react";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "secondary" | "error" | "primary";
}

const tones: Record<NonNullable<ChipProps["tone"]>, string> = {
  secondary: "bg-secondary-container text-on-secondary-container",
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
};

export function Chip({ tone = "secondary", className = "", children, ...props }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-label-large ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
