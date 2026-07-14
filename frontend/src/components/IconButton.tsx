import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "default" | "error";
}

const tones: Record<NonNullable<IconButtonProps["tone"]>, string> = {
  default: "text-on-surface-variant hover:bg-surface-variant",
  error: "text-error hover:bg-error-container/40",
};

export function IconButton({ tone = "default", className = "", ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
