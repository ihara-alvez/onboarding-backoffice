export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-on-surface-variant">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
      {label && <p className="text-body-medium">{label}</p>}
    </div>
  );
}
