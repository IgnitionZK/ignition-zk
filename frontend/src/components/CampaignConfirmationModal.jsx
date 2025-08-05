import React, { useEffect } from "react";
import styled from "styled-components";
import CustomButton from "./CustomButton";
import { calculateEpochPhases } from "../scripts/utils/epochPhaseCalculator";

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
  min-width: 500px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
`;

const ModalTitle = styled.h2`
  color: #a5b4fc;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 16px;
  text-align: center;
`;

const CampaignInfo = styled.div`
  margin-bottom: 24px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(165, 180, 252, 0.1);
`;

const InfoLabel = styled.span`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  font-weight: 500;
`;

const InfoValue = styled.span`
  color: var(--color-grey-100);
  font-size: 1.4rem;
  font-weight: 600;
`;

const PhasesSection = styled.div`
  margin-bottom: 24px;
`;

const PhasesTitle = styled.h3`
  color: var(--color-grey-100);
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
`;

const PhaseItem = styled.div`
  background: rgba(165, 180, 252, 0.05);
  border: 1px solid rgba(165, 180, 252, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
`;

const PhaseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const PhaseName = styled.span`
  color: #a5b4fc;
  font-size: 1.5rem;
  font-weight: 600;
`;

const PhaseDuration = styled.span`
  color: var(--color-grey-300);
  font-size: 1.3rem;
  font-weight: 500;
`;

const PhaseDates = styled.div`
  color: var(--color-grey-200);
  font-size: 1.3rem;
  line-height: 1.4;
`;

const WarningText = styled.div`
  color: var(--color-red-400);
  font-size: 1.3rem;
  text-align: center;
  margin-bottom: 24px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

function CampaignConfirmationModal({
  isOpen,
  campaignData,
  onConfirm,
  onCancel,
  isCreating = false,
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

  // Calculate phases for display
  const getPhases = () => {
    if (!campaignData?.startDate || !campaignData?.duration) return null;

    const weeks = parseInt(campaignData.duration.split(" ")[0]);
    const days = weeks * 7;

    const mockEpoch = {
      epoch_start_time: campaignData.startDate.toISOString(),
      epoch_duration: days,
    };

    return calculateEpochPhases(mockEpoch);
  };

  const phases = getPhases();

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay onClick={handleModalOverlayClick}>
      <ConfirmationModal>
        <ModalTitle>Confirm Campaign Creation</ModalTitle>

        <CampaignInfo>
          <InfoRow>
            <InfoLabel>Campaign Name:</InfoLabel>
            <InfoValue>{campaignData?.eventName}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Group:</InfoLabel>
            <InfoValue>{campaignData?.selectedGroup}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Duration:</InfoLabel>
            <InfoValue>{campaignData?.duration}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Start Date:</InfoLabel>
            <InfoValue>
              {campaignData?.startDate
                ? formatDate(campaignData.startDate)
                : ""}
            </InfoValue>
          </InfoRow>
        </CampaignInfo>

        {phases && (
          <PhasesSection>
            <PhasesTitle>Campaign Phases</PhasesTitle>

            <PhaseItem>
              <PhaseHeader>
                <PhaseName>Proposal Phase</PhaseName>
                <PhaseDuration>
                  {phases.proposalPhase.duration} day
                  {phases.proposalPhase.duration !== 1 ? "s" : ""}
                </PhaseDuration>
              </PhaseHeader>
              <PhaseDates>
                {formatDate(phases.proposalPhase.start)} -{" "}
                {formatDate(phases.proposalPhase.end)}
              </PhaseDates>
            </PhaseItem>

            <PhaseItem>
              <PhaseHeader>
                <PhaseName>Voting Phase</PhaseName>
                <PhaseDuration>
                  {phases.votingPhase.duration} day
                  {phases.votingPhase.duration !== 1 ? "s" : ""}
                </PhaseDuration>
              </PhaseHeader>
              <PhaseDates>
                {formatDate(phases.votingPhase.start)} -{" "}
                {formatDate(phases.votingPhase.end)}
              </PhaseDates>
            </PhaseItem>

            <PhaseItem>
              <PhaseHeader>
                <PhaseName>Review Phase</PhaseName>
                <PhaseDuration>
                  {phases.reviewPhase.duration} day
                  {phases.reviewPhase.duration !== 1 ? "s" : ""}
                </PhaseDuration>
              </PhaseHeader>
              <PhaseDates>
                {formatDate(phases.reviewPhase.start)} -{" "}
                {formatDate(phases.reviewPhase.end)}
              </PhaseDates>
            </PhaseItem>
          </PhasesSection>
        )}

        <WarningText>
          ⚠️ Once submitted, the campaign details cannot be altered.
        </WarningText>

        <ModalButtons>
          <CustomButton
            backgroundColor="#a5b4fc"
            textColor="#232328"
            hoverColor="#818cf8"
            onClick={onConfirm}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Campaign"}
          </CustomButton>
          <CustomButton
            backgroundColor="var(--color-grey-600)"
            textColor="#fff"
            hoverColor="var(--color-grey-500)"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel
          </CustomButton>
        </ModalButtons>
      </ConfirmationModal>
    </ModalOverlay>
  );
}

export default CampaignConfirmationModal;
