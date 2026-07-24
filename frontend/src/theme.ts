import { useLayoutEffect, useState } from "react";

export type Theme = "light" | "dark";

const themeStorageKey = "onboarding-backoffice-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readInitialTheme(): { theme: Theme; hasManualPreference: boolean } {
  const storedTheme = readStoredTheme();
  return storedTheme
    ? { theme: storedTheme, hasManualPreference: true }
    : { theme: readSystemTheme(), hasManualPreference: false };
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [{ theme, hasManualPreference }, setThemeState] = useState(readInitialTheme);

  useLayoutEffect(() => {
    if (theme === "dark") {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [theme]);

  useLayoutEffect(() => {
    if (hasManualPreference) return;

    let mediaQuery: MediaQueryList;
    try {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }

    const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
      setThemeState((current) =>
        current.hasManualPreference
          ? current
          : { theme: event.matches ? "dark" : "light", hasManualPreference: false },
      );
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [hasManualPreference]);

  function toggleTheme(): void {
    setThemeState((current) => {
      const nextTheme: Theme = current.theme === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch {
        // Theme changes remain available for the current session when storage is unavailable.
      }
      return { theme: nextTheme, hasManualPreference: true };
    });
  }

  return { theme, toggleTheme };
}
