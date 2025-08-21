import React from "react";
import styled from "styled-components";

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100%;
  min-width: 55rem;
  color: var(--color-grey-100);
  padding: 0 2rem;
  overflow: hidden;
`;

/**
 * Settings component that renders a basic settings page placeholder.
 * Currently displays a simple "Settings" text as a placeholder for future settings functionality.
 */
export default function Settings() {
  return (
    <PageContainer>
      <div>Settings</div>
    </PageContainer>
  );
}
