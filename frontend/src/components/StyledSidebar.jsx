import styled from "styled-components";
import MainNav from "./MainNav";

const StyledSidebar = styled.aside`
  background-color: var(--color-grey-800);
  padding: 3.2rem 2.4rem;
  border-right: 1px solid var(--color-grey-700);
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
`;

/**
 * Sidebar component that provides the main navigation interface.
 * Renders a styled aside element containing the MainNav component.
 */
function Sidebar() {
  return (
    <StyledSidebar>
      <MainNav />
    </StyledSidebar>
  );
}

export default Sidebar;
