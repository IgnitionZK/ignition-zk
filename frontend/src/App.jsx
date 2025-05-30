import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

// Pages
import Homepage from "./pages/Homepage";
import GenerateCredentials from "./pages/GenerateCredentials";

// styles
import GlobalStyles from "./styles/GlobalStyles";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
    },
  },
});

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
        element: <UserDashboard />,
      },
      {
        path: "/generate-credentials",
        element: <GenerateCredentials />,
      },
    ],
  },
  {
    path: "/",
    element: <Homepage />,
  },

  {
    path: "/login",
    element: <Login />,
  },
]);

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <GlobalStyles />
      </QueryClientProvider>
    </>
  );
}

export default App;
