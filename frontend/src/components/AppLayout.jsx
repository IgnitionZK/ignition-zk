// React imports
import { Outlet } from "react-router-dom";

/**
 * Main layout component that serves as a wrapper for the application's routes.
 * Uses React Router's Outlet to render nested route components.
 */
function AppLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}

export default AppLayout;
