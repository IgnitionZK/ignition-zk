import React, { useState, useRef, useEffect } from "react";
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
  right: ${(props) => (props.$fullWidth ? "0" : "0")};
  left: ${(props) => (props.$fullWidth ? "0" : "auto")};
  background: #3a4353;
  border: 1px solid #4a5568;
  border-radius: 8px;
  margin-top: 4px;
  padding: 8px 0;
  min-width: ${(props) => (props.$fullWidth ? "auto" : "160px")};
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

const CustomDropdown = ({
  options,
  selectedOption,
  onSelect,
  placeholder = "Select group",
  fullWidth = false,
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
              key={option}
              selected={option === selectedOption}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option}
            </DropdownItem>
          ))}
        </DropdownList>
      )}
    </DropdownContainer>
  );
};

export default CustomDropdown;
