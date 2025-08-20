// Libraries
import styled from "styled-components";

const StyledButton = styled.button`
  padding: ${(props) =>
    props.$size === "small"
      ? "8px 16px"
      : props.size === "large"
      ? "16px 32px"
      : "12px 24px"};
  background-color: ${(props) => props.$backgroundColor || "#007AFF"};
  color: ${(props) => props.$textColor || "#FFFFFF"};
  border: none;
  border-radius: 8px;
  font-size: ${(props) =>
    props.size === "small" ? "14px" : props.size === "large" ? "18px" : "16px"};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: ${(props) => (props.disabled ? "none" : "translateY(-1px)")};
    box-shadow: ${(props) =>
      props.disabled
        ? "0 2px 4px rgba(0, 0, 0, 0.1)"
        : "0 4px 8px rgba(0, 0, 0, 0.15)"};
    background-color: ${(props) =>
      props.disabled
        ? props.$backgroundColor || "#007AFF"
        : props.$hoverColor || "#0056b3"};
  }

  &:active {
    transform: ${(props) => (props.disabled ? "none" : "translateY(1px)")};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

/**
 * A customizable button component with support for different sizes, colors, and states.
 * Features hover effects, disabled state, and flexible styling options.
 */
function CustomButton({
  children,
  onClick,
  backgroundColor,
  textColor,
  hoverColor,
  size = "medium",
  fullWidth = false,
  disabled = false,
  type = "button",
  ...props
}) {
  return (
    <StyledButton
      onClick={onClick}
      $backgroundColor={backgroundColor}
      $textColor={textColor}
      $hoverColor={hoverColor}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </StyledButton>
  );
}

export default CustomButton;
