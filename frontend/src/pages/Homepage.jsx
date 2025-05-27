import styled from "styled-components";

const StyledHomepage = styled.div`
  background-color: var(--color-grey-800);
  color: var(--color-grey-100);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
`;

function Homepage() {
  return (
    <StyledHomepage>
      <h1>IgnitionZK</h1>
      <p>Anthony Spedaliere | Anastasia Tsitali</p>
      <p>© 2025</p>
    </StyledHomepage>
  );
}

export default Homepage;
