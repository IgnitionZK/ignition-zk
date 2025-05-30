import styled from "styled-components";
import LoginForm from "../components/LoginForm";

const LoginLayout = styled.main`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 48rem;
  align-content: center;
  justify-content: center;
  gap: 3.2rem;
  background-color: var(--color-grey-50);
`;

function Login() {
  return (
    <LoginLayout>
      <h4>Log into your account</h4>
      <LoginForm />
    </LoginLayout>
  );
}

export default Login;
