import React, { useState } from "react";
import styled from "styled-components";
import ProposalProgressBar from "./ProposalProgressBar";

const DemoContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const DemoSection = styled.div`
  margin-bottom: 3rem;
  padding: 2rem;
  background-color: rgba(165, 180, 252, 0.05);
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.1);
`;

const DemoTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 1.6rem;
  color: var(--color-grey-100);
`;

const DemoDescription = styled.p`
  font-size: 1.4rem;
  color: var(--color-grey-300);
  margin-bottom: 1.6rem;
  line-height: 1.5;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.6rem;
  flex-wrap: wrap;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ControlLabel = styled.label`
  font-size: 1.2rem;
  color: var(--color-grey-300);
  font-weight: 500;
`;

const Select = styled.select`
  padding: 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  background-color: rgba(165, 180, 252, 0.1);
  color: var(--color-grey-100);
  font-size: 1.2rem;
`;

const Checkbox = styled.input`
  width: 1.6rem;
  height: 1.6rem;
  accent-color: #a5b4fc;
`;

const ProposalProgressBarDemo = () => {
  const [currentStep, setCurrentStep] = useState(2);
  const [isStep2Rejected, setIsStep2Rejected] = useState(false);
  const [isStep3NotClaimed, setIsStep3NotClaimed] = useState(false);
  const [isStep5TransferRejected, setIsStep5TransferRejected] = useState(false);
  const [isStep6Completed, setIsStep6Completed] = useState(false);

  const handleStepChange = (e) => {
    const step = parseInt(e.target.value);
    setCurrentStep(step);

    // Reset rejection states when moving to earlier steps
    if (step < 2) setIsStep2Rejected(false);
    if (step < 3) setIsStep3NotClaimed(false);
    if (step < 5) setIsStep5TransferRejected(false);
  };

  return (
    <DemoContainer>
      <DemoTitle>Proposal Progress Bar Demo</DemoTitle>
      <DemoDescription>
        This demo shows the different states of the ProposalProgressBar
        component. Use the controls below to see how the progress bar changes
        based on the current step and various rejection scenarios.
      </DemoDescription>

      <DemoSection>
        <DemoTitle>Progress Bar States</DemoTitle>
        <ControlsContainer>
          <ControlGroup>
            <ControlLabel>Current Step:</ControlLabel>
            <Select value={currentStep} onChange={handleStepChange}>
              <option value={1}>1 - Submitted</option>
              <option value={2}>2 - Accepted</option>
              <option value={3}>3 - Claimed</option>
              <option value={4}>4 - Transfer Requested</option>
              <option value={5}>5 - Transfer Approved</option>
              <option value={6}>6 - Transfer Executed</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>
              <Checkbox
                type="checkbox"
                checked={isStep2Rejected}
                onChange={(e) => setIsStep2Rejected(e.target.checked)}
                disabled={currentStep < 2}
              />
              Step 2 Rejected
            </ControlLabel>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>
              <Checkbox
                type="checkbox"
                checked={isStep3NotClaimed}
                onChange={(e) => setIsStep3NotClaimed(e.target.checked)}
                disabled={currentStep < 3}
              />
              Step 3 Not Claimed
            </ControlLabel>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>
              <Checkbox
                type="checkbox"
                checked={isStep5TransferRejected}
                onChange={(e) => setIsStep5TransferRejected(e.target.checked)}
                disabled={currentStep < 5}
              />
              Step 5 Transfer Rejected
            </ControlLabel>
          </ControlGroup>

          <ControlGroup>
            <ControlLabel>
              <Checkbox
                type="checkbox"
                checked={isStep6Completed}
                onChange={(e) => setIsStep6Completed(e.target.checked)}
                disabled={currentStep < 6}
              />
              Step 6 Transfer Executed
            </ControlLabel>
          </ControlGroup>
        </ControlsContainer>

        <ProposalProgressBar
          currentStep={currentStep}
          isStep2Rejected={isStep2Rejected}
          isStep3NotClaimed={isStep3NotClaimed}
          isStep5TransferRejected={isStep5TransferRejected}
          isStep6Completed={isStep6Completed}
        />
      </DemoSection>

      <DemoSection>
        <DemoTitle>Usage Examples</DemoTitle>
        <DemoDescription>
          Here are some common scenarios you can test. Note that when a step is
          rejected, the progress bar segments after that step will not be
          highlighted:
        </DemoDescription>

        <ControlsContainer>
          <button
            onClick={() => {
              setCurrentStep(3);
              setIsStep2Rejected(false);
              setIsStep3NotClaimed(false);
              setIsStep5TransferRejected(false);
            }}
            style={{
              padding: "0.8rem 1.6rem",
              backgroundColor: "rgba(165, 180, 252, 0.1)",
              border: "1px solid rgba(165, 180, 252, 0.2)",
              borderRadius: "0.4rem",
              color: "#A5B4FC",
              cursor: "pointer",
            }}
          >
            Normal Flow - Step 3
          </button>

          <button
            onClick={() => {
              setCurrentStep(2);
              setIsStep2Rejected(true);
              setIsStep3NotClaimed(false);
              setIsStep5TransferRejected(false);
            }}
            style={{
              padding: "0.8rem 1.6rem",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "0.4rem",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            Step 2 Rejected
          </button>

          <button
            onClick={() => {
              setCurrentStep(3);
              setIsStep2Rejected(false);
              setIsStep3NotClaimed(true);
              setIsStep5TransferRejected(false);
            }}
            style={{
              padding: "0.8rem 1.6rem",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "0.4rem",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            Step 3 Not Claimed
          </button>

          <button
            onClick={() => {
              setCurrentStep(5);
              setIsStep2Rejected(false);
              setIsStep3NotClaimed(false);
              setIsStep5TransferRejected(true);
            }}
            style={{
              padding: "0.8rem 1.6rem",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "0.4rem",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            Step 5 Transfer Rejected
          </button>

          <button
            onClick={() => {
              setCurrentStep(6);
              setIsStep2Rejected(false);
              setIsStep3NotClaimed(false);
              setIsStep5TransferRejected(false);
            }}
            style={{
              padding: "0.8rem 1.6rem",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              borderRadius: "0.4rem",
              color: "#22c55e",
              cursor: "pointer",
            }}
          >
            All Steps Completed
          </button>

          <button
            onClick={() => {
              setCurrentStep(4);
              setIsStep2Rejected(false);
              setIsStep3NotClaimed(false);
              setIsStep5TransferRejected(false);
            }}
            style={{
              padding: "0.8rem 1.6rem",
              backgroundColor: "rgba(165, 180, 252, 0.1)",
              border: "1px solid rgba(165, 180, 252, 0.2)",
              borderRadius: "0.4rem",
              color: "#A5B4FC",
              cursor: "pointer",
            }}
          >
            Normal Flow - Step 4
          </button>
        </ControlsContainer>
      </DemoSection>
    </DemoContainer>
  );
};

export default ProposalProgressBarDemo;
