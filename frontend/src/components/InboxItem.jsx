// React and styling libraries
import { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";

// Components
import CustomButton from "./CustomButton";
import MnemonicInput from "./MnemonicInput";
import BallotModal from "./BallotModal";
import Spinner from "./Spinner";

// Hooks
import { useVerifyVote } from "../hooks/queries/proofs/useVerifyVote";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";
import { useInsertProof } from "../hooks/queries/proofs/useInsertProof";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useGetProposalSubmissionNullifier } from "../hooks/queries/proofs/useGetProposalSubmissionNullifier";

// Utils
import { calculateEpochPhases } from "../scripts/utils/epochPhaseCalculator";

const InboxItemContainer = styled.li`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-bottom: 1.2rem;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const ProposalTitle = styled.h3`
  font-weight: 500;
  font-size: 1.8rem;
  color: var(--color-grey-100);
  margin: 0;
`;

const GroupName = styled.span`
  color: var(--color-grey-100);
  font-size: 1.6rem;
  font-weight: 500;
`;

const DescriptionSection = styled.div`
  width: 100%;
`;

const InboxDescription = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  line-height: 1.4;
  margin: 0;
`;

const BottomRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const VotingWindow = styled.div`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  text-align: center;
  flex: 1;
`;

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

/**
 * InboxItem component displays a proposal in the user's inbox with the same styling
 * as InboxItem and full voting functionality including ballot selection, mnemonic input,
 * and proof submission using zero-knowledge proofs.
 */
function InboxItem({
  proposal,
  showSubmitButton = true,
  storedMnemonic = null,
  refetchPendingProposals = null,
  refetchProofs = null,
}) {
  // State management for voting workflow
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [hasSubmittedProof, setHasSubmittedProof] = useState(false);
  const [showBallotModal, setShowBallotModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);

  // Hooks for voting functionality
  const { userGroups } = useGetUserGroups();

  // Get commitment array for the proposal's group
  const { isLoading: isLoadingCommitments, commitmentArray } =
    useGetCommitmentArray({
      groupId: proposal.group_id,
    });

  // Hook for vote verification
  const { verifyVote, isVerifying } = useVerifyVote();

  // Hook for inserting proofs
  const { insertProof } = useInsertProof();

  // Get proposal submission nullifier from the database (same as InboxItem)
  const {
    isLoading: isLoadingNullifier,
    nullifierHash: proposalSubmissionNullifier,
  } = useGetProposalSubmissionNullifier(proposal.proposal_id);

  // Validate proposal prop
  if (!proposal || typeof proposal !== "object") {
    return (
      <InboxItemContainer>
        <TopRow>
          <ProposalTitle>Invalid Proposal Data</ProposalTitle>
          <GroupName>Unknown Group</GroupName>
        </TopRow>
        <DescriptionSection>
          <InboxDescription>
            Unable to display proposal information.
          </InboxDescription>
        </DescriptionSection>
      </InboxItemContainer>
    );
  }

  const getVotingWindow = () => {
    if (!proposal.epoch_start_time || !proposal.epoch_duration) {
      return "Voting window not available";
    }

    try {
      const epoch = {
        epoch_start_time: proposal.epoch_start_time,
        epoch_duration: proposal.epoch_duration,
      };

      const phases = calculateEpochPhases(epoch);
      const votingStart = phases.votingPhase.start;
      const votingEnd = phases.votingPhase.end;

      const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      return `Voting Window: ${formatDate(votingStart)} - ${formatDate(
        votingEnd
      )}`;
    } catch (error) {
      console.error("Error calculating voting window:", error);
      return "Voting window not available";
    }
  };

  const isInVotingPhase = () => {
    if (!proposal.epoch_start_time || !proposal.epoch_duration) {
      return false;
    }

    try {
      const epoch = {
        epoch_start_time: proposal.epoch_start_time,
        epoch_duration: proposal.epoch_duration,
      };

      const phases = calculateEpochPhases(epoch);
      const now = new Date();
      const votingStart = phases.votingPhase.start;
      const votingEnd = phases.votingPhase.end;

      return now >= votingStart && now < votingEnd;
    } catch (error) {
      console.error("Error checking voting phase:", error);
      return false;
    }
  };

  // Get the current user's group member ID for this group
  const userGroupMemberId = userGroups?.find(
    (group) => group.group_id === proposal.group_id
  )?.group_member_id;

  const handleDownloadDetails = () => {
    try {
      if (
        !proposal.proposal_metadata?.ipfs_cid &&
        !proposal.metadata?.ipfs_cid
      ) {
        console.warn("No IPFS CID found in proposal metadata");
        toast.error("No document available for this proposal.");
        return;
      }

      const ipfsCid =
        proposal.proposal_metadata?.ipfs_cid || proposal.metadata?.ipfs_cid;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
      window.open(ipfsUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Error opening document. Please try again.");
    }
  };

  const handleVote = () => {
    setShowBallotModal(true);
  };

  const handleBallotConfirm = (vote) => {
    setSelectedVote(vote);
    setShowBallotModal(false);
    setShowMnemonicInput(true);
  };

  const handleBallotCancel = () => {
    setShowBallotModal(false);
    setSelectedVote(null);
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

      if (!selectedVote) {
        throw new Error("No vote selected");
      }

      if (!proposalSubmissionNullifier) {
        throw new Error(
          "Proposal submission nullifier not found. The proposal may not have been properly submitted."
        );
      }

      if (!proposal.epoch_id) {
        throw new Error(
          "Proposal epoch ID is missing. Cannot proceed with voting."
        );
      }

      if (!proposal.group_id) {
        throw new Error(
          "Proposal group ID is missing. Cannot proceed with voting."
        );
      }

      if (!proposal.proposal_id) {
        throw new Error("Proposal ID is missing. Cannot proceed with voting.");
      }

      const {
        isValid,
        publicSignals,
        proof,
        contextKey: returnedContextKey,
      } = await verifyVote(
        commitmentArray,
        mnemonic,
        proposal.group_id,
        proposal.epoch_id,
        proposal.proposal_id,
        selectedVote === "reject" ? 0 : selectedVote === "approve" ? 1 : 2,
        proposal.proposal_title || proposal.title || "",
        proposal.proposal_description || proposal.description || "",
        proposal.proposal_payload || proposal.payload || {},
        proposal.proposal_funding || proposal.funding || {},
        proposal.proposal_metadata || proposal.metadata || {},
        proposalSubmissionNullifier
      );

      if (isValid) {
        const nullifierHash = publicSignals[1];

        const proofArray = proof.map((p) => p.toString());
        const publicSignalsArray = publicSignals.map((s) => s.toString());

        if (!returnedContextKey) {
          throw new Error(
            "contextKey not returned from verification process. This indicates an issue with the relayer or verification chain."
          );
        }

        await insertProof({
          proposalId: proposal.proposal_id,
          groupId: proposal.group_id,
          groupMemberId: userGroupMemberId,
          nullifierHash: nullifierHash.toString(),
          circuitType: "voting",
          proof: proofArray,
          publicSignals: publicSignalsArray,
          contextKey: returnedContextKey,
        });

        setHasSubmittedProof(true);
        toast.success(`Vote submitted successfully: ${selectedVote}`);
        if (refetchPendingProposals) {
          refetchPendingProposals();
        }
        if (refetchProofs) {
          refetchProofs();
        }
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
      toast.error("Failed to submit vote. Please try again.");
    } finally {
      setIsSubmitting(false);
      setSelectedVote(null);
    }
  };

  return (
    <>
      <InboxItemContainer>
        <TopRow>
          <ProposalTitle>
            {proposal.proposal_title || proposal.title || "Untitled Proposal"}
          </ProposalTitle>
          <GroupName>{proposal.group_name || "Unknown Group"}</GroupName>
        </TopRow>

        <DescriptionSection>
          <InboxDescription>
            {proposal.proposal_description ||
              proposal.description ||
              "No description available"}
          </InboxDescription>
        </DescriptionSection>

        <BottomRow>
          <CustomButton
            size="small"
            backgroundColor="rgba(165, 180, 252, 0.1)"
            hoverColor="rgba(165, 180, 252, 0.15)"
            textColor="#A5B4FC"
            onClick={handleDownloadDetails}
            style={{
              border: "1px solid rgba(165, 180, 252, 0.2)",
              padding: "0.8rem 1.6rem",
              fontSize: "1.4rem",
              fontWeight: "500",
              minWidth: "auto",
            }}
          >
            Download Details
          </CustomButton>

          <VotingWindow>{getVotingWindow()}</VotingWindow>

          {showSubmitButton && (
            <CustomButton
              size="small"
              backgroundColor="rgba(165, 180, 252, 0.1)"
              hoverColor="rgba(165, 180, 252, 0.15)"
              textColor="#ffffff"
              onClick={handleVote}
              style={{
                border: "1px solid rgba(165, 180, 252, 0.2)",
                padding: "0.8rem 1.6rem",
                fontSize: "1.4rem",
                fontWeight: "500",
                minWidth: "auto",
              }}
              disabled={
                isLoadingCommitments ||
                isLoadingNullifier ||
                isVerifying ||
                hasSubmittedProof ||
                isSubmitting ||
                !isInVotingPhase() ||
                !proposalSubmissionNullifier ||
                !proposal.epoch_id ||
                !proposal.group_id ||
                !proposal.proposal_id
              }
            >
              {isLoadingCommitments || isLoadingNullifier
                ? "Loading..."
                : isVerifying || isSubmitting
                ? "Verifying..."
                : !isInVotingPhase()
                ? "Voting Window Not Open"
                : !proposalSubmissionNullifier
                ? "Proposal Not Ready"
                : !proposal.epoch_id ||
                  !proposal.group_id ||
                  !proposal.proposal_id
                ? "Missing Data"
                : "Vote"}
            </CustomButton>
          )}
        </BottomRow>
      </InboxItemContainer>

      {showMnemonicInput && (
        <MnemonicInput
          proposal={proposal}
          onClose={() => setShowMnemonicInput(false)}
          onSubmit={handleSubmitMnemonic}
          prePopulatedMnemonic={storedMnemonic}
          selectedVote={selectedVote}
        />
      )}

      <BallotModal
        isOpen={showBallotModal}
        proposalTitle={
          proposal.proposal_title || proposal.title || "Untitled Proposal"
        }
        onConfirm={handleBallotConfirm}
        onCancel={handleBallotCancel}
      />

      {isSubmitting && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>Submitting vote...</LoadingText>
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
