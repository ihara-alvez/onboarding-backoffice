import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

/** MD3-style snackbar — bottom-centered, auto-dismisses. */
export function Toast({ message, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-xs bg-surface-variant px-4 py-3 text-body-medium text-on-surface-variant shadow-elevation-3">
        {message}
        <button
          type="button"
          onClick={onDismiss}
          className="text-label-large font-medium text-primary hover:opacity-80"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
