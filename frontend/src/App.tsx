import { Outlet } from "react-router-dom";
import { TopAppBar } from "./components/TopAppBar";

export function App() {
  return (
    <div className="min-h-screen bg-surface">
      <TopAppBar />
      <Outlet />
    </div>
  );
}
