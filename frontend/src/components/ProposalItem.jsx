import styled from "styled-components";
import { useState } from "react";
import CustomButton from "./CustomButton";
import MnemonicInput from "./MnemonicInput";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";
import { useGenerateProof } from "../hooks/queries/proofs/createNewProof";

const ProposalItemContainer = styled.li`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.2rem;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  font-size: 1.4rem;
  color: var(--color-grey-300);
`;

const StatusDot = styled.span`
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background-color: ${({ status }) => {
    switch (status) {
      case "active":
        return "#22c55e"; // green
      case "approved":
        return "#3b82f6"; // blue
      case "rejected":
        return "#ef4444"; // red
      case "executed":
        return "#eab308"; // yellow
      case "draft":
        return "#6b7280"; // gray
      case "pending_approval":
        return "#000000"; // black
      default:
        return "#6b7280"; // default gray
    }
  }};
`;

const ProposalInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
`;

const ProposalTitle = styled.span`
  font-weight: 500;
  font-size: 1.8rem;
`;

const GroupName = styled.span`
  color: var(--color-grey-300);
  font-size: 1.4rem;
`;

const ProposalDescription = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  line-height: 1.4;
`;

const VotingPeriod = styled.div`
  display: flex;
  gap: 1.6rem;
  color: var(--color-grey-400);
  font-size: 1.4rem;
`;

const VotingTime = styled.span`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

function ProposalItem({ proposal, showSubmitButton = true }) {
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const {
    isLoading: isLoadingCommitments,
    commitmentArray,
    error: commitmentError,
  } = useGetCommitmentArray({
    groupId: proposal.group_id,
  });

  const {
    generateProofFromInput,
    isLoading: isGeneratingProof,
    error: proofError,
  } = useGenerateProof();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = () => {
    setShowMnemonicInput(true);
  };

  const handleSubmitMnemonic = async (mnemonic) => {
    try {
      if (!commitmentArray) {
        throw new Error("Commitment array not loaded");
      }

      const { proof, publicSignals, circuitType } =
        await generateProofFromInput(commitmentArray, mnemonic, "membership");

      // TODO: Handle the generated proof and public signals
      console.log("Generated proof:", proof);
      console.log("Public signals:", publicSignals);
      console.log("circuitType", circuitType);

      setShowMnemonicInput(false);
    } catch (error) {
      console.error("Error generating proof:", error);
      // TODO: Handle error appropriately
    }
  };

  const formatStatus = (status) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <ProposalItemContainer>
        <ProposalInfo>
          <ProposalTitle>{proposal.title}</ProposalTitle>
          <GroupName>{proposal.group_name}</GroupName>
          <ProposalDescription>{proposal.description}</ProposalDescription>
          <VotingPeriod>
            <VotingTime>
              <span>Start:</span> {formatDate(proposal.voting_start_time)}
            </VotingTime>
            <VotingTime>
              <span>End:</span> {formatDate(proposal.voting_end_time)}
            </VotingTime>
          </VotingPeriod>
        </ProposalInfo>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "1.2rem",
          }}
        >
          <StatusIndicator>
            <StatusDot status={proposal.status} />
            {formatStatus(proposal.status)}
          </StatusIndicator>
          {showSubmitButton && (
            <CustomButton
              size="small"
              backgroundColor="rgba(165, 180, 252, 0.1)"
              hoverColor="rgba(165, 180, 252, 0.15)"
              textColor="#A5B4FC"
              onClick={handleSubmit}
              style={{
                border: "1px solid rgba(165, 180, 252, 0.2)",
                padding: "0.8rem 1.6rem",
                fontSize: "1.4rem",
                fontWeight: "500",
                minWidth: "auto",
              }}
              disabled={isLoadingCommitments || isGeneratingProof}
            >
              {isLoadingCommitments
                ? "Loading..."
                : isGeneratingProof
                ? "Generating..."
                : "Submit"}
            </CustomButton>
          )}
        </div>
      </ProposalItemContainer>

      {showMnemonicInput && (
        <MnemonicInput
          proposal={proposal}
          onClose={() => setShowMnemonicInput(false)}
          onSubmit={handleSubmitMnemonic}
        />
      )}
    </>
  );
}

export default ProposalItem;
