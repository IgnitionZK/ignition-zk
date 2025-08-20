// React Router components
import { Outlet } from "react-router-dom";

// Custom components
import Sidebar from "../components/StyledSidebar";

// Styling libraries
import styled from "styled-components";

const StyledAppLayout = styled.div`
  display: grid;
  grid-template-columns: 26rem 1fr;
  grid-template-rows: auto 1fr;
  height: 100vh;
  background-color: var(--color-grey-800);
  overflow: hidden;
`;

const Main = styled.main`
  padding: 4rem 4.8rem;
  height: 100%;
  overflow: hidden;
  position: relative;
`;

const Container = styled.div`
  max-width: 120rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  height: 100%;
  overflow-y: auto;
  padding-right: 1rem;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 0.8rem;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-grey-800);
    border-radius: 0.4rem;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-grey-600);
    border-radius: 0.4rem;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--color-grey-500);
  }
`;

/**
 * Main dashboard layout component that provides the structure for the user dashboard.
 * Renders a sidebar and main content area using React Router's Outlet for nested routes.
 */
function UserDashboard() {
  return (
    <StyledAppLayout>
      <Sidebar />
      <Main>
        <Container>
          <Outlet />
        </Container>
      </Main>
    </StyledAppLayout>
  );
}

export default UserDashboard;
