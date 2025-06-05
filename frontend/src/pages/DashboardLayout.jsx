import { Outlet } from "react-router-dom";
import Sidebar from "../components/StyledSidebar";
import styled from "styled-components";

/**
 * Styled component that creates the main layout grid for the dashboard.
 * Uses CSS Grid to create a two-column layout with a fixed sidebar and main content area.
 * @type {import('styled-components').StyledComponent<'div', any>}
 */
const StyledAppLayout = styled.div`
  display: grid;
  grid-template-columns: 26rem 1fr;
  grid-template-rows: auto 1fr;
  height: 100vh;
  background-color: var(--color-grey-800);
`;

const Main = styled.main`
  padding: 4rem 4.8rem;
  height: 100%;
  overflow: auto;
`;

const Container = styled.div`
  max-width: 120rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  height: 100%;
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
