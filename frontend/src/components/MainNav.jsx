import { NavLink } from "react-router-dom";
import styled from "styled-components";

const NavList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  height: 100%;
`;

const NavContainer = styled.nav`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledNavLink = styled(NavLink)`
  &:link,
  &:visited {
    display: flex;
    align-items: center;
    gap: 1.2rem;

    color: var(--color-grey-300);
    font-size: 1.6rem;
    font-weight: 500;
    padding: 1.2rem 2.4rem;
    transition: all 0.3s;
  }

  /* This works because react-router places the active class on the active NavLink */
  &:hover,
  &:active,
  &.active:link,
  &.active:visited {
    color: var(--color-grey-50);
    background-color: var(--color-grey-700);
    border-radius: var(--border-radius-sm);
  }

  & svg {
    width: 2.4rem;
    height: 2.4rem;
    color: var(--color-grey-400);
    transition: all 0.3s;
  }

  &:hover svg,
  &:active svg,
  &.active:link svg,
  &.active:visited svg {
    color: var(--color-brand-400);
  }
`;

const LogoutLink = styled(StyledNavLink)`
  &:link,
  &:visited {
    color: var(--color-red-400);
  }

  &:hover,
  &:active,
  &.active:link,
  &.active:visited {
    color: var(--color-red-300);
    background-color: var(--color-red-900);
  }
`;

const LogoutContainer = styled.div`
  margin-top: auto;
`;

function MainNav() {
  return (
    <NavContainer>
      <NavList>
        <li>
          <StyledNavLink to="." end>
            <span>Home</span>
          </StyledNavLink>
        </li>
        <li>
          <StyledNavLink to="generate-credentials" end>
            <span>Settings</span>
          </StyledNavLink>
        </li>
      </NavList>
      <LogoutContainer>
        <NavList>
          <li>
            <LogoutLink to="/homepage" end>
              <span>Logout</span>
            </LogoutLink>
          </li>
        </NavList>
      </LogoutContainer>
    </NavContainer>
  );
}

export default MainNav;
