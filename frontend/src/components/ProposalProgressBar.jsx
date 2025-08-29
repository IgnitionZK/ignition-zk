import React from "react";
import styled from "styled-components";
import { FaCheck, FaTimes } from "react-icons/fa";

const ProgressBarContainer = styled.div`
  background-color: rgba(59, 62, 112, 0.8);
  border-radius: 0.8rem;
  padding: 2rem;
  margin: 1.6rem 0;
  position: relative;
`;

const ProgressLine = styled.div`
  position: relative;
  height: 0.4rem;
  background-color: rgba(127, 132, 176, 0.6);
  border-radius: 0.2rem;
  margin: 2rem auto 3rem auto;
  width: 80%;
`;

const ProgressSegment = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: ${({ $isCompleted, $isRejected }) => {
    if ($isRejected) return "#ef4444";
    if ($isCompleted) return "#22c55e";
    return "transparent";
  }};
  border-radius: 0.2rem;
  transition: all 0.3s ease-in-out;
  width: ${({ $width }) => $width}%;
  left: ${({ $left }) => $left}%;
`;

const StepContainer = styled.div`
  position: absolute;
  top: -1.2rem;
  left: ${({ $position }) => $position}%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
`;

const StepCircle = styled.div`
  width: ${({ $isCurrent, $isCompleted, $isRejected }) => {
    if ($isCurrent) return "3.2rem";
    if ($isCompleted || $isRejected) return "2.4rem";
    return "2.4rem";
  }};
  height: ${({ $isCurrent, $isCompleted, $isRejected }) => {
    if ($isCurrent) return "3.2rem";
    if ($isCompleted || $isRejected) return "2.4rem";
    return "2.4rem";
  }};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $isCurrent, $isCompleted, $isRejected }) => {
    if ($isRejected) return "#ef4444";
    if ($isCompleted) return "#22c55e";
    if ($isCurrent) return "#6b7280";
    return "rgba(127, 132, 176, 0.6)";
  }};
  color: white;
  font-weight: 600;
  font-size: ${({ $isCurrent }) => ($isCurrent ? "1.6rem" : "1.4rem")};
  transition: all 0.3s ease-in-out;
  border: 2px solid
    ${({ $isCurrent, $isCompleted, $isRejected }) => {
      if ($isRejected) return "#ef4444";
      if ($isCompleted) return "#22c55e";
      if ($isCurrent) return "#6b7280";
      return "rgba(127, 132, 176, 0.6)";
    }};
`;

const StepLabel = styled.span`
  font-size: 1.2rem;
  font-weight: 500;
  color: ${({ $isCompleted, $isRejected }) => {
    if ($isRejected) return "#ef4444";
    if ($isCompleted) return "#22c55e";
    return "rgba(255, 255, 255, 0.8)";
  }};
  text-align: center;
  max-width: 8rem;
  line-height: 1.2;
  transition: all 0.3s ease-in-out;
`;

const PhaseLabel = styled.div`
  position: absolute;
  top: -3rem;
  left: ${({ $left }) => $left}%;
  transform: translateX(-50%);
  font-size: 1rem;
  color: ${({ $isCompleted }) =>
    $isCompleted ? "#22c55e" : "rgba(255, 255, 255, 0.6)"};
  font-weight: 500;
  text-align: center;
  transition: all 0.3s ease-in-out;
`;

const ProposalProgressBar = ({
  currentStep = 1,
  isStep2Rejected = false,
  isStep3NotClaimed = false,
  isStep5TransferRejected = false,
  isStep6Completed = false,
}) => {
  const steps = [
    { id: 1, label: "Submitted", position: 0 },
    { id: 2, label: "Accepted", position: 20 },
    { id: 3, label: "Claimed", position: 40 },
    { id: 4, label: "Transfer Requested", position: 60 },
    { id: 5, label: "Transfer Approved", position: 80 },
    { id: 6, label: "Transfer Executed", position: 100 },
  ];

  const getStepStatus = (stepId) => {
    // Step 1 is always completed since a proposal must be submitted to exist
    if (stepId === 1) {
      return { isCompleted: true, isRejected: false, isCurrent: false };
    }

    if (stepId === 2 && isStep2Rejected) {
      return { isCompleted: false, isRejected: true, isCurrent: false };
    }
    if (stepId === 3 && isStep3NotClaimed) {
      return { isCompleted: false, isRejected: true, isCurrent: false };
    }
    if (stepId === 5 && isStep5TransferRejected) {
      return { isCompleted: false, isRejected: true, isCurrent: false };
    }
    if (stepId === 6 && isStep6Completed) {
      return { isCompleted: true, isRejected: false, isCurrent: false };
    }

    if (stepId < currentStep) {
      return { isCompleted: true, isRejected: false, isCurrent: false };
    }
    if (stepId === currentStep) {
      return { isCompleted: false, isRejected: false, isCurrent: true };
    }

    return { isCompleted: false, isRejected: false, isCurrent: false };
  };

  const getStepLabel = (stepId, originalLabel) => {
    if (stepId === 2 && isStep2Rejected) return "Rejected";
    if (stepId === 3 && isStep3NotClaimed) return "Not Claimed";
    if (stepId === 5 && isStep5TransferRejected) return "Transfer Rejected";
    return originalLabel;
  };

  const getProgressSegments = () => {
    const segments = [];
    let hasRejectionOccurred = false;

    // Only create segments between steps, not beyond the last step
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStepData = steps[i];
      const nextStepData = steps[i + 1];
      const currentStatus = getStepStatus(currentStepData.id);
      const nextStatus = getStepStatus(nextStepData.id);

      // A segment is rejected if the NEXT step is rejected (this segment leads TO the rejected step)
      const isRejected = nextStatus.isRejected;

      // A segment is completed if the current step is completed AND either:
      // 1. The next step is also completed, OR
      // 2. The next step is the current step (meaning we've advanced to that step)
      // AND no rejection has occurred
      const isCompleted =
        currentStatus.isCompleted &&
        (nextStatus.isCompleted || nextStatus.isCurrent) &&
        !hasRejectionOccurred;

      // Check if we've encountered a rejection at the NEXT step
      if (nextStatus.isRejected) {
        hasRejectionOccurred = true;
      }

      segments.push({
        left: currentStepData.position,
        width: nextStepData.position - currentStepData.position,
        isCompleted,
        isRejected,
      });
    }

    return segments;
  };

  return (
    <ProgressBarContainer>
      <ProgressLine>
        {getProgressSegments().map((segment, index) => (
          <ProgressSegment
            key={index}
            $left={segment.left}
            $width={segment.width}
            $isCompleted={segment.isCompleted}
            $isRejected={segment.isRejected}
          />
        ))}

        {/* Phase Labels */}
        <PhaseLabel $left={10} $isCompleted={currentStep >= 2}>
          Proposal Voting Phase
        </PhaseLabel>
        <PhaseLabel $left={30} $isCompleted={currentStep >= 3}>
          Proposal Review Phase
        </PhaseLabel>

        {/* Step Indicators */}
        {steps.map((step) => {
          const status = getStepStatus(step.id);
          const label = getStepLabel(step.id, step.label);

          return (
            <StepContainer key={step.id} $position={step.position}>
              <StepCircle
                $isCurrent={status.isCurrent}
                $isCompleted={status.isCompleted}
                $isRejected={status.isRejected}
              >
                {status.isCompleted ? (
                  <FaCheck size={16} />
                ) : status.isRejected ? (
                  <FaTimes size={16} />
                ) : (
                  step.id
                )}
              </StepCircle>
              <StepLabel
                $isCompleted={status.isCompleted}
                $isRejected={status.isRejected}
              >
                {label}
              </StepLabel>
            </StepContainer>
          );
        })}
      </ProgressLine>
    </ProgressBarContainer>
  );
};

export default ProposalProgressBar;
