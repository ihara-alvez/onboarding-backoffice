import { Outlet } from "react-router-dom";
import { TopAppBar } from "./components/TopAppBar";
import { useTheme } from "./theme";

export function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface">
      <TopAppBar theme={theme} onToggleTheme={toggleTheme} />
      <Outlet />
    </div>
  );
}
