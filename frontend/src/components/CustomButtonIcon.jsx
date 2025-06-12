import styled from "styled-components";

const ButtonContainer = styled.div`
  position: relative;
  cursor: pointer;

  svg {
    color: var(--color-grey-100);
    font-size: 2rem;
    transition: color 0.2s ease-in-out;
  }

  &:hover {
    svg {
      color: ${(props) => props.$hoverColor || "var(--color-grey-300)"};
    }
  }
`;

const Tooltip = styled.div`
  position: absolute;
  right: 0;
  top: -3rem;
  background-color: var(--color-grey-800);
  color: var(--color-grey-100);
  padding: 0.8rem 1.2rem;
  border-radius: 0.4rem;
  font-size: 1.4rem;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;

  ${ButtonContainer}:hover & {
    opacity: 1;
    visibility: visible;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -0.5rem;
    right: 1rem;
    border-width: 0.5rem;
    border-style: solid;
    border-color: var(--color-grey-800) transparent transparent transparent;
  }
`;

function CustomButtonIcon({
  tooltipText,
  onClick,
  icon: Icon,
  hoverColor,
  iconProps,
}) {
  return (
    <ButtonContainer onClick={onClick} $hoverColor={hoverColor}>
      <Icon {...iconProps} />
      <Tooltip>{tooltipText}</Tooltip>
    </ButtonContainer>
  );
}

export default CustomButtonIcon;
