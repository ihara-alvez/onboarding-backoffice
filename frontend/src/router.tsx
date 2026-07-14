import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { OnboardingListPage } from "./pages/OnboardingListPage";
import { CreateOnboardingPage } from "./pages/CreateOnboardingPage";
import { OnboardingDetailPage } from "./pages/OnboardingDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <OnboardingListPage /> },
      { path: "new", element: <CreateOnboardingPage /> },
      { path: "onboardings/:id", element: <OnboardingDetailPage /> },
    ],
  },
]);
