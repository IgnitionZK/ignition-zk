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

const router = createBrowserRouter([
  {
    path: "/",
    element: <Homepage />,
  },
  {
    path: "/GenerateCredentials",
    element: <GenerateCredentials />,
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <GlobalStyles />
    </>
  );
}

export default App;
