import styled from "styled-components";
import { useState } from "react";
import CustomButton from "./CustomButton";
import MnemonicInput from "./MnemonicInput";
//import { useVerifyMembership } from "../hooks/queries/proofs/useVerifyMembership";
import { useVerifyProposal } from "../hooks/queries/proofs/useVerifyProposal";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";
import { useInsertProof } from "../hooks/queries/proofs/useInsertProof";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";

const InboxItemContainer = styled.li`
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
  background-color: ${({ $isVerified }) =>
    $isVerified ? "#22c55e" : "#ef4444"}; // green if verified, red if not
`;

const InboxInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
`;

const InboxTitle = styled.span`
  font-weight: 500;
  font-size: 1.8rem;
`;

const GroupName = styled.span`
  color: var(--color-grey-300);
  font-size: 1.4rem;
`;

const InboxDescription = styled.p`
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

function InboxItem({ proposal, showSubmitButton = true, isVerified = false }) {
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [hasSubmittedProof, setHasSubmittedProof] = useState(false);
  const { userGroups } = useGetUserGroups();

  const {
    isLoading: isLoadingCommitments,
    commitmentArray,
    error: commitmentError,
  } = useGetCommitmentArray({
    groupId: proposal.group_id,
  });

  const {
    verifyProposal,
    isVerifying,
    error: verificationError,
  } = useVerifyProposal();

  const { insertProof, isLoading: isInsertingProof } = useInsertProof();

  // Find the user's group member ID for this proposal's group
  const userGroupMemberId = userGroups?.find(
    (group) => group.group_id === proposal.group_id
  )?.group_member_id;

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
    setShowMnemonicInput(false);

    try {
      if (!commitmentArray) {
        throw new Error("Commitment array not loaded");
      }

      if (!userGroupMemberId) {
        throw new Error("Could not find your group member ID for this group");
      }

      // Get the proof and verification result
      const { isValid, publicSignals } = await verifyProposal(
        commitmentArray,
        mnemonic,
        proposal.group_id,
        proposal.epoch_id,
        proposal.title,
        proposal.description,
        proposal.payload
      );

      if (isValid) {
        const nullifierHash = publicSignals[1]; // Second value in publicSignals is the proposal nullifier hash

        await insertProof({
          proposalId: proposal.proposal_id,
          groupId: proposal.group_id,
          groupMemberId: userGroupMemberId,
          nullifierHash,
        });
        setHasSubmittedProof(true);
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
    }
  };

  return (
    <>
      <InboxItemContainer>
        <InboxInfo>
          <InboxTitle>{proposal.title}</InboxTitle>
          <GroupName>{proposal.group_name}</GroupName>
          <InboxDescription>{proposal.description}</InboxDescription>
          <VotingPeriod>
            <VotingTime>
              <span>Start:</span> {formatDate(proposal.voting_start_time)}
            </VotingTime>
            <VotingTime>
              <span>End:</span> {formatDate(proposal.voting_end_time)}
            </VotingTime>
          </VotingPeriod>
        </InboxInfo>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "1.2rem",
          }}
        >
          <StatusIndicator>
            <StatusDot $isVerified={isVerified} />
            {isVerified ? "Verified" : "Pending"}
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
              disabled={
                isLoadingCommitments || isVerifying || hasSubmittedProof
              }
            >
              {isLoadingCommitments
                ? "Loading..."
                : isVerifying
                ? "Verifying..."
                : "Submit"}
            </CustomButton>
          )}
        </div>
      </InboxItemContainer>

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

export default InboxItem;
