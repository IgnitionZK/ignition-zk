// Libraries
import styled from "styled-components";

const Spinner = styled.div`
  width: 1.6rem;
  height: 1.6rem;
  border: 2px solid rgba(165, 180, 252, 0.3);
  border-top: 2px solid #a5b4fc;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

/**
 * A small loading spinner component that displays a circular animation.
 * Used to indicate loading states in the UI with a minimal footprint.
 */
function MiniSpinner() {
  return <Spinner />;
}

export default MiniSpinner;
