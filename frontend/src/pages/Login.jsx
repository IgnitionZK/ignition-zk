// Libraries
import styled from "styled-components";

// Components
import LoginForm from "../components/LoginForm";

const LoginLayout = styled.main`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 48rem;
  align-content: center;
  justify-content: center;
  gap: 3.2rem;
  background-color: var(--color-grey-800);
`;

/**
 * Login page component that renders the login form in a centered layout
 */
function Login() {
  return (
    <LoginLayout>
      <LoginForm />
    </LoginLayout>
  );
}

export default Login;
