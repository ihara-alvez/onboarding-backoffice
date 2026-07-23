import { Link, useLocation } from "react-router-dom";

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

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

export function TopAppBar() {
  const location = useLocation();
  const peopleActive =
    location.pathname === "/" || location.pathname.startsWith("/onboardings");

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container px-8 shadow-elevation-1">
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

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Search"
          className="text-on-surface-variant hover:text-on-surface"
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative text-on-surface-variant hover:text-on-surface"
        >
          <BellIcon />
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
