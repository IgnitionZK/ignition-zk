// React imports
import React, { useState, useRef, useEffect } from "react";

// Styling libraries
import styled from "styled-components";

const DropdownContainer = styled.div`
  position: relative;
  display: ${(props) => (props.$fullWidth ? "block" : "inline-block")};
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
`;

const DropdownButton = styled.button`
  background: #3a4353;
  color: var(--color-grey-100);
  padding: 8px 16px;
  border: 1px solid #4a5568;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: ${(props) => (props.$fullWidth ? "auto" : "160px")};
  width: ${(props) => (props.$fullWidth ? "100%" : "auto")};
  justify-content: space-between;

  &:hover {
    background: #444b5e;
  }
`;

const DropdownList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #3a4353;
  border: 1px solid #4a5568;
  border-radius: 8px;
  margin-top: 4px;
  padding: 8px 0;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const DropdownItem = styled.li`
  padding: 8px 16px;
  cursor: pointer;
  font-size: 1.4rem;
  color: var(--color-grey-100);
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: #444b5e;
  }

  ${({ selected }) =>
    selected &&
    `
    background: #444b5e;
    font-weight: 500;
  `}
`;

const ItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
`;

const ItemName = styled.span`
  font-size: 1.4rem;
  color: var(--color-grey-100);
`;

const ItemStatus = styled.span`
  font-size: 1.1rem;
  color: ${(props) => {
    if (props.$isInProposalPhase) return "#22c55e"; // green
    if (props.$currentPhase === "completed") return "#6b7280"; // gray
    if (props.$currentPhase === "pending") return "#f59e0b"; // amber
    return "#ef4444"; // red
  }};
  font-weight: 500;
`;

/**
 * A customizable dropdown component that supports both simple string options and complex objects with status information.
 * Features include click-outside-to-close functionality, full-width support, and conditional selection based on proposal phase status.
 */
const CustomDropdown = ({
  options,
  selectedOption,
  onSelect,
  placeholder = "Select group",
  fullWidth = false,
  showStatus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDisplayText = (option) => {
    if (typeof option === "string") return option;
    return option.name || option;
  };

  const getOptionValue = (option) => {
    if (typeof option === "string") return option;
    return option.name || option;
  };

  const isOptionSelected = (option) => {
    const optionValue = getOptionValue(option);
    return optionValue === selectedOption;
  };

  return (
    <DropdownContainer ref={dropdownRef} $fullWidth={fullWidth}>
      <DropdownButton onClick={() => setIsOpen(!isOpen)} $fullWidth={fullWidth}>
        {selectedOption || placeholder}
        <span>▼</span>
      </DropdownButton>
      {isOpen && (
        <DropdownList $fullWidth={fullWidth}>
          {options.map((option) => (
            <DropdownItem
              key={getOptionValue(option)}
              selected={isOptionSelected(option)}
              onClick={() => {
                if (typeof option === "string" || option.isInProposalPhase) {
                  onSelect(getOptionValue(option));
                  setIsOpen(false);
                }
              }}
              style={{
                cursor:
                  typeof option === "string" || option.isInProposalPhase
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  typeof option === "string" || option.isInProposalPhase
                    ? 1
                    : 0.6,
              }}
            >
              {showStatus && typeof option === "object" ? (
                <>
                  <ItemContent>
                    <ItemName>{option.name}</ItemName>
                    <ItemStatus
                      $isInProposalPhase={option.isInProposalPhase}
                      $currentPhase={option.currentPhase}
                    >
                      {option.isInProposalPhase
                        ? "Available for proposals"
                        : `(${option.phaseName} - must be in Proposal Phase to submit)`}
                    </ItemStatus>
                  </ItemContent>
                </>
              ) : (
                getDisplayText(option)
              )}
            </DropdownItem>
          ))}
        </DropdownList>
      )}
    </DropdownContainer>
  );
};

export default CustomDropdown;
