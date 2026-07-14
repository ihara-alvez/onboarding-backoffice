import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tint?: "surface" | "primary" | "error";
}

const tints: Record<NonNullable<CardProps["tint"]>, string> = {
  surface: "bg-surface-container text-on-surface",
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
};

export function Card({ tint = "surface", className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-md shadow-elevation-1 p-6 ${tints[tint]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
