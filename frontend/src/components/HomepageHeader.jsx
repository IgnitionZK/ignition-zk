import styled from "styled-components";
import CustomButton from "./CustomButton";

const StyledHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 4rem;
  border-bottom: 1px solid var(--color-grey-700);
`;

const Title = styled.h1`
  font-size: 2.4rem;
  font-weight: 600;
`;

function HomepageHeader() {
  return (
    <StyledHeader>
      <Title>IgnitionZK</Title>
      <CustomButton
        $backgroundColor="var(--color-grey-700)"
        $hoverColor="var(--color-grey-600)"
        $textColor="var(--color-grey-100)"
      >
        Generate Credentials
      </CustomButton>
    </StyledHeader>
  );
}

export default HomepageHeader;
