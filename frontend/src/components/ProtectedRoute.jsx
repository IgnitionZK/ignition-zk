import { styled } from "styled-components";
import { useUser } from "../hooks/queries/authentication/useUser";
import Spinner from "./Spinner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const FullPage = styled.div`
  height: 100vh;
  background-color: var(--color-grey-50);
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * A wrapper component that protects routes requiring authentication.
 * Shows a loading spinner while checking auth status and redirects unauthenticated users to the homepage.
 */
function ProtectedRoute({ children }) {
  const navigate = useNavigate();

  // 1. Load authenticated user
  const { isLoading, isAuthenticated } = useUser();

  // 2. If there is NO authenticated user redirect to the login page
  useEffect(
    function () {
      if (!isAuthenticated && !isLoading) navigate("/homepage");
    },
    [isAuthenticated, isLoading, navigate]
  );

  // 3. While loading show spinner
  if (isLoading)
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );

  // 4. If there IS a user, render the app
  if (isAuthenticated) return children;
}

export default ProtectedRoute;
