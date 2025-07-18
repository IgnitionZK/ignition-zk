import styled from "styled-components";
import { useState } from "react";
import CustomButton from "./CustomButton";
import MnemonicInput from "./MnemonicInput";
import ConfirmationModal from "./ConfirmationModal";
import Spinner from "./Spinner";
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

// Loading Overlay Styles
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const LoadingText = styled.p`
  color: #fff;
  font-size: 1.8rem;
  margin-top: 16px;
  text-align: center;
`;

function InboxItem({
  proposal = {},
  showSubmitButton = true,
  isVerified = false,
}) {
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [hasSubmittedProof, setHasSubmittedProof] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userGroups } = useGetUserGroups();

  const { isLoading: isLoadingCommitments, commitmentArray } =
    useGetCommitmentArray({
      groupId: proposal.group_id,
    });

  const { verifyProposal, isVerifying } = useVerifyProposal();

  const { insertProof } = useInsertProof();

  // Guard clause to handle undefined/null proposal
  if (!proposal || typeof proposal !== "object") {
    return (
      <InboxItemContainer>
        <InboxInfo>
          <InboxTitle>Invalid Proposal Data</InboxTitle>
          <InboxDescription>
            Unable to display proposal information.
          </InboxDescription>
        </InboxInfo>
      </InboxItemContainer>
    );
  }

  // Find the user's group member ID for this proposal's group
  const userGroupMemberId = userGroups?.find(
    (group) => group.group_id === proposal.group_id
  )?.group_member_id;

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Not set";
    }
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    setShowMnemonicInput(true);
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  const handleSubmitMnemonic = async (mnemonic) => {
    setShowMnemonicInput(false);
    setIsSubmitting(true);

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
        proposal.payload,
        proposal.funding || {},
        proposal.metadata || {}
      );

      if (isValid) {
        const nullifierHash = publicSignals[1]; // Second value in publicSignals is the proposal submission nullifier hash

        await insertProof({
          proposalId: proposal.proposal_id,
          groupId: proposal.group_id,
          groupMemberId: userGroupMemberId,
          nullifierHash,
          circuitType: "proposal",
        });
        setHasSubmittedProof(true);
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <InboxItemContainer>
        <InboxInfo>
          <InboxTitle>{proposal.title || "Untitled Proposal"}</InboxTitle>
          <GroupName>{proposal.group_name || "Unknown Group"}</GroupName>
          <InboxDescription>
            {proposal.description || "No description available"}
          </InboxDescription>
          <VotingPeriod>
            <VotingTime>
              <span>Created:</span> {formatDate(proposal.created_at)}
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
                isLoadingCommitments ||
                isVerifying ||
                hasSubmittedProof ||
                isSubmitting
              }
            >
              {isLoadingCommitments
                ? "Loading..."
                : isVerifying || isSubmitting
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

      <ConfirmationModal
        isOpen={showSubmitConfirm}
        title="Submit Proof"
        message={`Are you sure you want to submit a zero-knowledge proof for the proposal "${
          proposal.title || "Untitled Proposal"
        }"? This action will verify your membership and submit your vote anonymously.`}
        confirmText="Submit"
        cancelText="Cancel"
        confirmButtonColor="#a5b4fc"
        confirmButtonHoverColor="#818cf8"
        cancelButtonColor="var(--color-grey-600)"
        cancelButtonHoverColor="var(--color-grey-500)"
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
      />

      {/* Loading Overlay */}
      {isSubmitting && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>Submitting proof...</LoadingText>
          <LoadingText
            style={{
              fontSize: "1.4rem",
              marginTop: "0.8rem",
              color: "var(--color-grey-300)",
            }}
          >
            This may take several minutes.
          </LoadingText>
        </LoadingOverlay>
      )}
    </>
  );
}

export default InboxItem;
