import React, { useEffect, useState } from "react";
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

const BallotModal = styled.div`
  background: var(--color-grey-800);
  border-radius: 12px;
  padding: 32px 24px 24px 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const BallotTitle = styled.h2`
  color: #ffffff;
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
`;

const BallotUnderline = styled.div`
  width: 60px;
  height: 2px;
  background: #ffffff;
  margin-bottom: 24px;
`;

const ProposalTitle = styled.h3`
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 400;
  margin-bottom: 24px;
  text-align: center;
  line-height: 1.4;
`;

const VotingOptionsPanel = styled.div`
  background: var(--color-grey-700);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  width: 100%;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  cursor: pointer;
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 400;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    opacity: 0.8;
  }
`;

const RadioInput = styled.input`
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid
    ${({ checked }) => (checked ? "#ffffff" : "var(--color-grey-500)")};
  border-radius: 50%;
  background: ${({ checked }) => (checked ? "#ffffff" : "transparent")};
  position: relative;
  cursor: pointer;

  &:checked::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: #000000;
    border-radius: 50%;
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  width: 100%;
`;

const ConfirmButton = styled(CustomButton)`
  background: #a5b4fc !important;
  color: #232328 !important;
  border: none !important;
  padding: 12px 24px !important;
  border-radius: 8px !important;
  font-size: 1.4rem !important;
  font-weight: 500 !important;
  min-width: 100px !important;

  &:hover {
    background: #818cf8 !important;
  }
`;

const CancelButton = styled(CustomButton)`
  background: var(--color-red-300) !important;
  color: var(--color-grey-800) !important;
  border: none !important;
  padding: 12px 24px !important;
  border-radius: 8px !important;
  font-size: 1.4rem !important;
  font-weight: 500 !important;
  min-width: 100px !important;

  &:hover {
    background: var(--color-red-400) !important;
  }
`;

/**
 * BallotModal component for voting on proposals
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.proposalTitle - Title of the proposal being voted on
 * @param {Function} props.onConfirm - Callback when confirm button is clicked (receives selected vote)
 * @param {Function} props.onCancel - Callback when cancel button is clicked
 */
function BallotModalComponent({ isOpen, proposalTitle, onConfirm, onCancel }) {
  const [selectedVote, setSelectedVote] = useState(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedVote(null);
    }
  }, [isOpen]);

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === "Escape") {
        setSelectedVote(null); // Reset selection
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
      setSelectedVote(null); // Reset selection
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (!selectedVote) {
      return; // Don't proceed if no vote is selected
    }
    onConfirm(selectedVote);
  };

  const handleCancel = () => {
    setSelectedVote(null); // Reset selection
    onCancel();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay onClick={handleModalOverlayClick}>
      <BallotModal>
        <BallotTitle>Ballot</BallotTitle>
        <BallotUnderline />
        <ProposalTitle>{proposalTitle || "Untitled Proposal"}</ProposalTitle>

        <VotingOptionsPanel>
          <RadioOption>
            <RadioInput
              type="radio"
              name="vote"
              value="approve"
              checked={selectedVote === "approve"}
              onChange={(e) => setSelectedVote(e.target.value)}
            />
            Approve
          </RadioOption>

          <RadioOption>
            <RadioInput
              type="radio"
              name="vote"
              value="reject"
              checked={selectedVote === "reject"}
              onChange={(e) => setSelectedVote(e.target.value)}
            />
            Reject
          </RadioOption>

          <RadioOption>
            <RadioInput
              type="radio"
              name="vote"
              value="abstain"
              checked={selectedVote === "abstain"}
              onChange={(e) => setSelectedVote(e.target.value)}
            />
            Abstain
          </RadioOption>
        </VotingOptionsPanel>

        <ModalButtons>
          <ConfirmButton onClick={handleConfirm} disabled={!selectedVote}>
            Confirm
          </ConfirmButton>
          <CancelButton onClick={handleCancel}>Cancel</CancelButton>
        </ModalButtons>
      </BallotModal>
    </ModalOverlay>
  );
}

export default BallotModalComponent;
