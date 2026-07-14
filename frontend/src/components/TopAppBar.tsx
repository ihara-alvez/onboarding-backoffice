import { Link } from "react-router-dom";

export function TopAppBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-surface-container px-8 py-4 shadow-elevation-1">
      <Link to="/" className="text-title-large font-medium text-on-surface no-underline">
        Onboarding Backoffice
      </Link>
      <Link
        to="/new"
        className="rounded-xl bg-primary px-6 py-2.5 text-label-large font-medium text-on-primary no-underline hover:opacity-90"
      >
        New onboarding
      </Link>
    </header>
  );
}
