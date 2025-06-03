import { NavLink } from "react-router-dom";
import styled from "styled-components";
import { useLogout } from "../hooks/queries/authentication/useLogout";

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

const CustomButton = styled.button`
  background-color: var(--color-red-300);
  color: var(--color-grey-800);
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.8rem;
  font-size: 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;

  &:hover {
    background-color: var(--color-red-400);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const LogoutContainer = styled.div`
  margin-top: auto;
  padding: 0 2.4rem;
`;

function MainNav() {
  const { logout, isPending } = useLogout();

  return (
    <NavContainer>
      <NavList>
        <li>
          <StyledNavLink to="." end>
            <span>Home</span>
          </StyledNavLink>
        </li>
        <li>
          <StyledNavLink to="settings" end>
            <span>Settings</span>
          </StyledNavLink>
        </li>
      </NavList>
      <LogoutContainer>
        <NavList>
          <li>
            <CustomButton onClick={logout} disabled={isPending}>
              {isPending ? "Logging out..." : "Logout"}
            </CustomButton>
          </li>
        </NavList>
      </LogoutContainer>
    </NavContainer>
  );
}

export default MainNav;
