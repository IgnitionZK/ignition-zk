// Libraries
import styled from "styled-components";

// Components
import HomepageHeader from "../components/HomepageHeader";

const StyledHomepage = styled.div`
  background-color: var(--color-grey-800);
  color: var(--color-grey-100);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
`;

const Footer = styled.footer`
  padding: 1rem;
  text-align: center;
  border-top: 1px solid var(--color-grey-700);
  margin-top: auto;
`;

/**
 * Homepage component that serves as the landing page for IgnitionZK.
 * Displays the application header, main content with title and description,
 * and footer with credits. Provides a clean, centered layout for introducing
 * users to the zero-knowledge proof-based governance platform.
 */
function Homepage() {
  return (
    <StyledHomepage>
      <HomepageHeader />
      <MainContent>
        <h1>IgnitionZK</h1>
        <h3>
          IgnitionZK leverages the power of zero knowledge proofs for anonymous
          voting, proposals, and membership.
        </h3>
      </MainContent>
      <Footer>
        <p>Anthony Spedaliere | Anastasia Tsitali</p>
        <p>© 2025</p>
      </Footer>
    </StyledHomepage>
  );
}

export default Homepage;
