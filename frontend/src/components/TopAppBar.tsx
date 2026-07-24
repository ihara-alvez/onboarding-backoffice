import { Link, useLocation } from "react-router-dom";
import {
  BellIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

function BrandMark() {
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary"
      aria-hidden="true"
    >
      <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-[3px] border-on-primary" />
    </span>
  );
}

export function TopAppBar() {
  const location = useLocation();
  const peopleActive =
    location.pathname === "/" || location.pathname.startsWith("/onboardings");

  return (
    <header className="sticky top-0 z-10 flex h-auto min-h-16 flex-wrap items-center justify-between gap-y-2 border-b border-outline-variant bg-surface-container px-8 py-3 shadow-elevation-1">
      <div className="flex h-full items-center gap-10">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-title-large font-semibold text-on-surface no-underline"
        >
          <BrandMark />
          <span>IAVA Workshop</span>
        </Link>
        <nav
          className="hidden h-full items-center gap-7 md:flex"
          aria-label="Primary navigation"
        >
          <Link
            to="/"
            className={`flex h-full items-center border-b-2 px-1 text-body-medium no-underline ${peopleActive ? "border-primary font-medium text-on-surface" : "border-transparent text-on-surface-variant"}`}
          >
            People
          </Link>
          {[
            ["Plans", "Plans are managed from each onboarding workspace."],
            ["Tasks", "Tasks will appear here as onboarding tracking expands."],
            [
              "Reports",
              "Reports will appear here as onboarding tracking expands.",
            ],
            ["Settings", "Settings will appear here as configuration expands."],
          ].map(([label, title]) => (
            <span
              key={label}
              title={title}
              className="flex h-full items-center px-1 text-body-medium text-on-surface-variant"
            >
              {label}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex max-w-full flex-wrap items-center justify-end gap-4">
        <button
          type="button"
          aria-label="Search"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <BellIcon className="h-5 w-5" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-variant text-label-large font-medium text-on-surface-variant"
          aria-label="Account"
        >
          AR
        </span>
        <Link
          to="/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-label-large font-medium text-on-primary no-underline shadow-elevation-1 hover:opacity-90"
        >
          New onboarding
        </Link>
      </div>
    </header>
  );
}
