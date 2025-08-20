// React and hooks
import React, { useEffect } from "react";

// Styling
import styled from "styled-components";

// Components
import CustomButton from "./CustomButton";

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ConfirmationModal = styled.div`
  background: #232328;
  border-radius: 12px;
  padding: 32px 24px 24px 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ModalTitle = styled.h2`
  color: #a5b4fc;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 16px;
  text-align: center;
`;

const ModalMessage = styled.p`
  color: #fff;
  font-size: 1.4rem;
  margin-bottom: 24px;
  text-align: center;
  line-height: 1.5;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

/**
 * A reusable confirmation modal component that displays a customizable dialog with confirm and cancel actions.
 * Supports keyboard navigation (Escape key), click-outside-to-close, and customizable button styling.
 */
function ConfirmationModalComponent({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "#a5b4fc",
  confirmButtonHoverColor = "#818cf8",
  cancelButtonColor = "var(--color-grey-600)",
  cancelButtonHoverColor = "var(--color-grey-500)",
  confirmButtonTextColor = "#232328",
  cancelButtonTextColor = "#fff",
  onConfirm,
  onCancel,
  showCancelButton = true,
  disableConfirmButton = false,
  disableCancelButton = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel]);

  const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay onClick={handleModalOverlayClick}>
      <ConfirmationModal>
        <ModalTitle>{title}</ModalTitle>
        <ModalMessage>{message}</ModalMessage>
        <ModalButtons>
          <CustomButton
            backgroundColor={confirmButtonColor}
            textColor={confirmButtonTextColor}
            hoverColor={confirmButtonHoverColor}
            onClick={onConfirm}
            disabled={disableConfirmButton}
          >
            {confirmText}
          </CustomButton>
          {showCancelButton && (
            <CustomButton
              backgroundColor={cancelButtonColor}
              textColor={cancelButtonTextColor}
              hoverColor={cancelButtonHoverColor}
              onClick={onCancel}
              disabled={disableCancelButton}
            >
              {cancelText}
            </CustomButton>
          )}
        </ModalButtons>
      </ConfirmationModal>
    </ModalOverlay>
  );
}

export default ConfirmationModalComponent;
