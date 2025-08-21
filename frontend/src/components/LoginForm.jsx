// React and libraries
import React, { useState } from "react";
import styled from "styled-components";

// Components
import CustomButton from "./CustomButton";

// Hooks
import { useLogin } from "../hooks/queries/authentication/useLogin";

const FormContainer = styled.div`
  background: var(--color-grey-800);
  border-radius: 10px;
  padding: 32px 24px 24px 24px;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const FormTitle = styled.h3`
  color: var(--color-grey-100);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Input = styled.input`
  padding: 12px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
  transition: border 0.2s;
  width: 100%;
  &:focus {
    border-color: #6366f1;
  }
`;

/**
 * A form component that handles user authentication by collecting email and password.
 * Provides a clean interface for users to log in to the application.
 */
const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useLogin();

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    login(
      { email, password },
      {
        onSettled: () => {
          setEmail(""), setPassword("");
        },
      }
    );
  }

  return (
    <FormContainer>
      <FormTitle>Login</FormTitle>
      <StyledForm onSubmit={handleSubmit}>
        <div>
          <Input
            id="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <Input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isLoading}
            required
          />
        </div>
        <CustomButton
          backgroundColor="#A5B4FC"
          hoverColor="#818cf8"
          textColor="#232328"
          size="large"
          fullWidth
          type="submit"
          disabled={isLoading}
        >
          Log in
        </CustomButton>
      </StyledForm>
    </FormContainer>
  );
};

export default LoginForm;
