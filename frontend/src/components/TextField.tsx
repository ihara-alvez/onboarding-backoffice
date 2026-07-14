import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, className = "", ...props }: TextFieldProps) {
  const inputId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-label-large text-on-surface-variant">{label}</span>
      <input
        id={inputId}
        className={`rounded-xs border border-outline-variant bg-surface-container px-4 py-2.5 text-body-large text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      />
    </label>
  );
}
