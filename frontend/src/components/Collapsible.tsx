import { useState } from "react";
import type { ReactNode } from "react";

interface CollapsibleProps {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Collapsible({ label, defaultOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 py-1 text-label-large font-medium text-on-surface-variant hover:text-on-surface"
      >
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
