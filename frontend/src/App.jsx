import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";

// Pages
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Proposals from "./pages/Proposals";
import Proofs from "./pages/Proofs";

// components
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

// styles
import GlobalStyles from "./styles/GlobalStyles";

/**
 * QueryClient configuration for React Query
 * @type {QueryClient}
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
    },
  },
});

/**
 * Application router configuration using React Router
 * Defines all routes and their corresponding components
 * @type {BrowserRouter}
 */
const router = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "inbox",
            element: <Proofs />,
          },
          {
            path: "proposals",
            element: <Proposals />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
        ],
      },
    ],
  },
  {
    path: "/",
    element: <Navigate replace to="/dashboard" />,
  },
  {
    path: "/homepage",
    element: <Homepage />,
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

/**
 * Main App component that sets up the application's core providers and layout
 *
 * @component
 * @returns {JSX.Element} The rendered application with all necessary providers
 *
 * @description
 * This component serves as the root of the application and provides:
 * - React Query for data fetching and caching
 * - React Router for navigation
 * - Global styles
 * - Toast notifications
 * - React Query DevTools in development
 */
function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <GlobalStyles />
        <ReactQueryDevtools />

        <Toaster
          position="top-center"
          gutter={12}
          containerStyle={{ margin: "8px" }}
          toastOptions={{
            success: {
              duration: 5000,
            },
            error: {
              duration: 5000,
            },
            style: {
              fontSize: "16px",
              maxWidth: "500px",
              padding: "16px 24px",
            },
          }}
        />
      </QueryClientProvider>
    </>
  );
}

export default App;
