// React hooks
import { useEffect } from "react";

// React Router
import { useNavigate } from "react-router-dom";

// Styled components
import { styled } from "styled-components";

// Custom hooks
import { useUser } from "../hooks/queries/authentication/useUser";

// Components
import Spinner from "./Spinner";

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

  const { isLoading, isAuthenticated } = useUser();

  useEffect(
    function () {
      if (!isAuthenticated && !isLoading) navigate("/homepage");
    },
    [isAuthenticated, isLoading, navigate]
  );

  if (isLoading)
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );

  if (isAuthenticated) return children;
}

export default ProtectedRoute;
