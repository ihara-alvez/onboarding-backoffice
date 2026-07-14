import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "outlined" | "text";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-label-large font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  filled: "bg-primary text-on-primary hover:opacity-90",
  outlined: "border border-outline text-primary hover:bg-primary-container/40",
  text: "text-primary hover:bg-primary-container/30",
};

export function Button({ variant = "filled", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
