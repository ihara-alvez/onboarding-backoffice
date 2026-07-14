import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, id, className = "", ...props }: SelectProps) {
  const selectId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={selectId} className="flex flex-col gap-1.5">
      <span className="text-label-large text-on-surface-variant">{label}</span>
      <select
        id={selectId}
        className={`rounded-xs border border-outline-variant bg-surface-container px-4 py-2.5 text-body-large text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
