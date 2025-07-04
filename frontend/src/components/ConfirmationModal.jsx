import React, { useEffect } from "react";
import styled from "styled-components";
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
 * A reusable confirmation modal component that can be customized with different messages,
 * titles, and button configurations.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message/description
 * @param {string} props.confirmText - Text for the confirm button
 * @param {string} props.cancelText - Text for the cancel button
 * @param {string} props.confirmButtonColor - Background color for confirm button
 * @param {string} props.confirmButtonHoverColor - Hover color for confirm button
 * @param {string} props.cancelButtonColor - Background color for cancel button
 * @param {string} props.cancelButtonHoverColor - Hover color for cancel button
 * @param {Function} props.onConfirm - Callback when confirm button is clicked
 * @param {Function} props.onCancel - Callback when cancel button is clicked
 * @param {boolean} props.showCancelButton - Whether to show the cancel button (default: true)
 * @param {boolean} props.disableConfirmButton - Whether to disable the confirm button
 * @param {boolean} props.disableCancelButton - Whether to disable the cancel button
 * @param {string} props.confirmButtonTextColor - Text color for confirm button
 * @param {string} props.cancelButtonTextColor - Text color for cancel button
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
  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel]);

  // Handle clicking outside the modal to close it
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
