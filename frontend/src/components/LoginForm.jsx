import React, { useState } from "react";
import styled from "styled-components";
import CustomButton from "./CustomButton";
import { useLogin } from "../hooks/queries/authentication/useLogin";

const FormContainer = styled.div`
  background: #fff;
  border-radius: 10px;
  padding: 32px 24px 24px 24px;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Label = styled.label`
  font-size: 1rem;
  color: #444;
  margin-bottom: 6px;
`;

const Input = styled.input`
  padding: 12px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
  transition: border 0.2s;
  &:focus {
    border-color: #6366f1;
  }
`;

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
      <StyledForm onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isLoading}
            required
          />
        </div>
        <CustomButton
          backgroundColor="#5850ec"
          hoverColor="#4338ca"
          textColor="#fff"
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
