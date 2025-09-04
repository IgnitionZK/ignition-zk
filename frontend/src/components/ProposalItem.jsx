// Libraries
import styled from "styled-components";
import toast from "react-hot-toast";

// Components
import CustomButton from "./CustomButton";
import MnemonicInput from "./MnemonicInput";
import Spinner from "./Spinner";
import ProposalProgressBar from "./ProposalProgressBar";

// Hooks
import { useState } from "react";
import { useGetEpochsByGroupId } from "../hooks/queries/epochs/useGetEpochsByGroupId";
import { useVerifyProposalClaim } from "../hooks/queries/proofs/useVerifyProposalClaim";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";
import { useGetProposalSubmissionNullifier } from "../hooks/queries/proofs/useGetProposalSubmissionNullifier";
import { useUpdateProposalStatus } from "../hooks/queries/proposals/useUpdateProposalStatus";

// Utilities
import { calculateEpochPhases } from "../scripts/utils/epochPhaseCalculator";
import { calculateProgressBarStep } from "../scripts/utils/progressBarStepCalculator";
import { getClaimedStatusId } from "../services/apiProposalStatus";
import { useRelayerDistributeFunding } from "../hooks/relayers/useRelayerDistributeFunding";
import { getFundingTypeFromProposal } from "../scripts/utils/fundingTypes";
import { ZKProofGenerator } from "../scripts/generateZKProof";

const ProposalItemContainer = styled.li`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  margin-bottom: 1.2rem;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.2rem;
`;

const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
`;

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.8rem;
  min-width: 200px;
`;

const ProposalTitle = styled.span`
  font-weight: 500;
  font-size: 1.8rem;
  color: var(--color-grey-100);
`;

const GroupName = styled.span`
  color: var(--color-grey-100);
  font-size: 1.6rem;
  font-weight: 500;
`;

const ProposalDescription = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  line-height: 1.4;
  margin: 0;
`;

const StatusIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.8rem;
  font-size: 1.4rem;
  color: var(--color-grey-300);
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const VoteTally = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  font-size: 1.2rem;
  color: var(--color-grey-400);
`;

const VoteCount = styled.span`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const VoteLabel = styled.span`
  font-weight: 500;
  min-width: 4rem;
  text-align: right;
`;

const VoteNumber = styled.span`
  color: var(--color-grey-300);
  font-weight: 600;
`;

const StatusDot = styled.span`
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background-color: ${({ $status }) => {
    switch ($status) {
      case "active":
        return "#22c55e"; // green
      case "approved":
        return "#3b82f6"; // blue
      case "rejected":
        return "#ef4444"; // red
      case "executed":
        return "#eab308"; // yellow
      case "claimed":
        return "#8b5cf6"; // purple
      case "draft":
        return "#6b7280"; // gray
      case "pending_approval":
        return "#000000"; // black
      default:
        return "#6b7280"; // default gray
    }
  }};
`;

const FooterSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.6rem;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(165, 180, 252, 0.1);
`;

const VotingWindow = styled.div`
  color: var(--color-grey-300);
  font-size: 1.4rem;
`;

const ClaimButton = styled(CustomButton)`
  && {
    background-color: rgba(165, 180, 252, 0.1);
    border: 1px solid rgba(165, 180, 252, 0.2);
    padding: 0.8rem 1.6rem;
    font-size: 1.4rem;
    font-weight: 500;
    min-width: auto;

    &:hover {
      background-color: rgba(165, 180, 252, 0.15);
    }
  }
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

/**
 * ProposalItem - A React component that displays individual proposal information
 * with voting status, claim functionality, and interactive features for DAO governance.
 * Handles proposal display, award claiming through ZK proofs, and status updates.
 */
function ProposalItem({ proposal = {} }) {
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [progress, setProgress] = useState("");

  const { epochs, isLoading: isLoadingEpochs } = useGetEpochsByGroupId(
    proposal.group_id
  );
  // console.log(proposal);
  const {
    verifyProposalClaim,
    isVerifying,
    error: claimError,
  } = useVerifyProposalClaim();
  const { commitmentArray, isLoading: isLoadingCommitments } =
    useGetCommitmentArray({
      groupId: proposal.group_id,
    });

  const { updateStatus: updateProposalStatus, isLoading: isUpdatingStatus } =
    useUpdateProposalStatus();

  const {
    nullifierHash: proposalSubmissionNullifier,
    isLoading: isLoadingSubmissionNullifier,
  } = useGetProposalSubmissionNullifier(proposal.proposal_id);

  const { distributeFunding, isDistributing } = useRelayerDistributeFunding();

  if (!proposal || typeof proposal !== "object") {
    return (
      <ProposalItemContainer>
        <HeaderSection>
          <LeftSection>
            <ProposalTitle>Invalid Proposal Data</ProposalTitle>
            <ProposalDescription>
              Unable to display proposal information.
            </ProposalDescription>
          </LeftSection>
        </HeaderSection>
      </ProposalItemContainer>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Not set";
    }
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", {
        dateString,
        error: error.message,
      });
      return "Invalid date";
    }
  };

  const formatStatus = (statusType) => {
    if (!statusType) {
      return "Unknown";
    }
    return statusType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleReviewDetails = () => {
    try {
      if (!proposal.metadata || !proposal.metadata.ipfs_cid) {
        console.warn("No IPFS CID found in proposal metadata");
        toast.error("No document available for this proposal.");
        return;
      }

      const ipfsCid = proposal.metadata.ipfs_cid;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;

      console.log("Opening document from IPFS:", ipfsUrl);
      window.open(ipfsUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Error opening document. Please try again.");
    }
  };

  const handleClaimAward = () => {
    setShowMnemonicInput(true);
  };

  const handleMnemonicSubmit = async (mnemonic) => {
    setShowMnemonicInput(false);
    setIsClaiming(true);
    setProgress("Verifying proposal claim...");

    try {
      if (!commitmentArray) {
        throw new Error("Commitment array not loaded");
      }

      if (!proposal.epoch_id) {
        throw new Error("Proposal epoch ID not found");
      }

      if (proposal.status_type !== "approved") {
        throw new Error(
          "Proposal is not in a claimable state. Only approved proposals can be claimed."
        );
      }

      if (!proposal.claim_hash) {
        throw new Error(
          "Proposal claim hash not found. This proposal may not be eligible for claiming."
        );
      }

      if (!proposalSubmissionNullifier) {
        throw new Error(
          "Proposal submission nullifier not found. The proposal may not have been properly submitted or verified."
        );
      }

      const proposalClaimHash = proposal.claim_hash;
      const proposalSubmissionHash = proposalSubmissionNullifier;

      console.log("Claiming award for proposal:", proposal.proposal_id);
      console.log("Using claim hash:", proposalClaimHash);
      console.log("Using submission hash:", proposalSubmissionHash);

      setProgress("Generating zero-knowledge proof...");

      const { isValid, publicSignals } = await verifyProposalClaim(
        commitmentArray,
        mnemonic,
        proposal.group_id,
        proposal.epoch_id,
        proposalClaimHash,
        proposalSubmissionHash
      );

      if (isValid) {
        console.log("Proposal claim verified successfully");

        setProgress("Updating proposal status...");

        try {
          const claimedStatusId = getClaimedStatusId();
          console.log(
            "Updating proposal status to claimed with ID:",
            claimedStatusId
          );

          await updateProposalStatus({
            proposalId: proposal.proposal_id,
            statusId: claimedStatusId,
          });

          console.log("Proposal status updated to claimed successfully");

          // After successful claim, distribute the funds
          setProgress("Distributing funds...");

          try {
            // Extract funding data from proposal
            const recipient = proposal.payload?.calldata?.recipient;
            const amount = proposal.payload?.calldata?.amount;
            const fundingType = getFundingTypeFromProposal(proposal.funding);

            if (!recipient || !amount) {
              throw new Error(
                "Missing recipient or amount in proposal payload"
              );
            }

            // Compute context key dynamically using vote context key (group, epoch, proposal)
            const contextKey = await ZKProofGenerator.computeVoteContextKey(
              proposal.group_id,
              proposal.epoch_id,
              proposal.proposal_id
            );
            console.log(contextKey);

            console.log("Distributing funds with data:", {
              groupId: proposal.group_id,
              contextKey: contextKey,
              recipient,
              amount,
              fundingType,
              expectedProposalNullifier: proposalSubmissionHash,
              proposalId: proposal.proposal_id,
            });

            const distributionResult = await distributeFunding({
              groupId: proposal.group_id,
              contextKey: contextKey,
              recipient,
              amount,
              fundingType,
              expectedProposalNullifier: proposalSubmissionHash,
              proposalId: proposal.proposal_id,
            });

            console.log("Fund distribution successful:", distributionResult);
            toast.success(
              "Award claimed, funds distributed, and transfer requested successfully!"
            );
          } catch (distributionError) {
            console.error("Failed to distribute funds:", distributionError);
            toast.success("Award claimed successfully!");
          }
        } catch (statusUpdateError) {
          console.error("Failed to update proposal status:", statusUpdateError);
          toast.success("Award claimed successfully!");
        }
      } else {
        throw new Error("Proposal claim verification failed");
      }
    } catch (error) {
      console.error("Proposal claim error:", error);
      toast.error(error.message || "Failed to claim award. Please try again.");
    } finally {
      setIsClaiming(false);
      setProgress("");
    }
  };

  const handleMnemonicClose = () => {
    setShowMnemonicInput(false);
  };

  const getProgressData = () => {
    if (!proposal.epoch_id || !epochs || isLoadingEpochs) {
      return {
        currentStep: 1,
        isStep2Rejected: false,
        isStep3NotClaimed: false,
        isStep5TransferRejected: false,
        isStep6Completed: false,
      };
    }

    try {
      const proposalEpoch = epochs.find(
        (epoch) => epoch.epoch_id === proposal.epoch_id
      );

      if (!proposalEpoch) {
        return {
          currentStep: 1,
          isStep2Rejected: false,
          isStep3NotClaimed: false,
          isStep5TransferRejected: false,
          isStep6Completed: false,
        };
      }

      const epochData = {
        epoch_start_time: proposalEpoch.epoch_start_time,
        epoch_duration: proposalEpoch.epoch_duration,
      };

      const phases = calculateEpochPhases(epochData);

      return calculateProgressBarStep(proposal, phases);
    } catch (error) {
      console.error("Error calculating progress data:", {
        error: error.message,
        stack: error.stack,
        proposalId: proposal.proposal_id,
        epochId: proposal.epoch_id,
        groupId: proposal.group_id,
      });

      return {
        currentStep: 1,
        isStep2Rejected: false,
        isStep3NotClaimed: false,
        isStep5TransferRejected: false,
        isStep6Completed: false,
      };
    }
  };

  const getVotingWindow = () => {
    if (!proposal.epoch_id || !epochs || isLoadingEpochs) {
      return "Voting window not available";
    }

    try {
      const proposalEpoch = epochs.find(
        (epoch) => epoch.epoch_id === proposal.epoch_id
      );

      if (!proposalEpoch) {
        return "Voting window not available";
      }

      const epochData = {
        epoch_start_time: proposalEpoch.epoch_start_time,
        epoch_duration: proposalEpoch.epoch_duration,
      };

      const phases = calculateEpochPhases(epochData);

      const votingStart = formatDate(phases.votingPhase.start);
      const votingEnd = formatDate(phases.votingPhase.end);

      return `Voting Window: ${votingStart} - ${votingEnd}`;
    } catch (error) {
      console.error("Error calculating voting window:", {
        error: error.message,
        stack: error.stack,
        proposalId: proposal.proposal_id,
        epochId: proposal.epoch_id,
        groupId: proposal.group_id,
      });

      if (error.message.includes("epoch_start_time")) {
        return "Invalid epoch start time";
      } else if (error.message.includes("epoch_duration")) {
        return "Invalid epoch duration";
      } else if (error.message.includes("calculateEpochPhases")) {
        return "Error calculating phases";
      } else {
        return "Voting window calculation failed";
      }
    }
  };

  return (
    <>
      <ProposalItemContainer>
        <HeaderSection>
          <LeftSection>
            <ProposalTitle>
              {proposal.title || "Untitled Proposal"}
            </ProposalTitle>
            <ProposalDescription>
              {proposal.description || "No description available"}
            </ProposalDescription>
          </LeftSection>
          <RightSection>
            <GroupName>{proposal.group_name || "Unknown Group"}</GroupName>
            <StatusIndicator>
              <StatusRow>
                <StatusDot $status={proposal.status_type || "unknown"} />
                {formatStatus(proposal.status_type)}
              </StatusRow>
              {proposal.vote_tally && (
                <VoteTally>
                  <VoteCount>
                    <VoteLabel>For:</VoteLabel>
                    <VoteNumber>{proposal.vote_tally.yes || 0}</VoteNumber>
                  </VoteCount>
                  <VoteCount>
                    <VoteLabel>Against:</VoteLabel>
                    <VoteNumber>{proposal.vote_tally.no || 0}</VoteNumber>
                  </VoteCount>
                  <VoteCount>
                    <VoteLabel>Abstain:</VoteLabel>
                    <VoteNumber>{proposal.vote_tally.abstain || 0}</VoteNumber>
                  </VoteCount>
                </VoteTally>
              )}
            </StatusIndicator>
          </RightSection>
        </HeaderSection>

        <ProposalProgressBar
          currentStep={getProgressData().currentStep}
          isStep2Rejected={getProgressData().isStep2Rejected}
          isStep3NotClaimed={getProgressData().isStep3NotClaimed}
          isStep5TransferRejected={getProgressData().isStep5TransferRejected}
          isStep6Completed={getProgressData().isStep6Completed}
        />

        <FooterSection>
          <CustomButton
            size="small"
            backgroundColor="rgba(165, 180, 252, 0.1)"
            hoverColor="rgba(165, 180, 252, 0.15)"
            textColor="#A5B4FC"
            style={{
              border: "1px solid rgba(165, 180, 252, 0.2)",
              padding: "0.8rem 1.6rem",
              fontSize: "1.4rem",
              fontWeight: "500",
              minWidth: "auto",
            }}
            onClick={handleReviewDetails}
          >
            Review Details
          </CustomButton>
          {proposal.status_type === "active" ? (
            <VotingWindow>{getVotingWindow()}</VotingWindow>
          ) : proposal.status_type === "approved" ? (
            <>
              <ClaimButton
                size="small"
                backgroundColor="rgba(165, 180, 252, 0.1)"
                hoverColor="rgba(165, 180, 252, 0.15)"
                textColor="#A5B4FC"
                onClick={handleClaimAward}
                disabled={
                  isClaiming ||
                  isLoadingCommitments ||
                  isLoadingSubmissionNullifier ||
                  isVerifying ||
                  isUpdatingStatus ||
                  isDistributing ||
                  !proposal.claim_hash ||
                  !proposalSubmissionNullifier
                }
                title={
                  !proposal.claim_hash
                    ? "No claim hash available"
                    : !proposalSubmissionNullifier
                    ? "No submission nullifier available"
                    : "Click to claim award"
                }
              >
                {isClaiming || isVerifying || isUpdatingStatus || isDistributing
                  ? progress || "Claiming..."
                  : isLoadingSubmissionNullifier
                  ? "Loading..."
                  : "Claim Award"}
              </ClaimButton>
              {(!proposal.claim_hash || !proposalSubmissionNullifier) && (
                <div
                  style={{
                    fontSize: "1.2rem",
                    color: "var(--color-red-400)",
                    marginTop: "0.4rem",
                    textAlign: "center",
                  }}
                >
                  {!proposal.claim_hash
                    ? "No claim hash available"
                    : "No submission nullifier available"}
                </div>
              )}
            </>
          ) : null}
        </FooterSection>
      </ProposalItemContainer>

      {showMnemonicInput && (
        <MnemonicInput
          title="Claim Award"
          subtitle={`Enter your mnemonic phrase to claim the award for "${
            proposal.title || "Untitled Proposal"
          }"`}
          wordCount={12}
          contextInfo={{
            proposalTitle: proposal.title || "Untitled Proposal",
            groupName: proposal.group_name || "Unknown Group",
            claimHash: proposal.claim_hash
              ? `Claim Hash: ${proposal.claim_hash.substring(0, 10)}...`
              : "No claim hash",
            submissionNullifier: proposalSubmissionNullifier
              ? `Submission Nullifier: ${proposalSubmissionNullifier.substring(
                  0,
                  10
                )}...`
              : "No submission nullifier",
          }}
          onClose={handleMnemonicClose}
          onSubmit={handleMnemonicSubmit}
          confirmButtonText="Claim Award"
          cancelButtonText="Cancel"
          confirmationMessage={`Are you sure you want to claim the award for "${
            proposal.title || "Untitled Proposal"
          }"? This will require your mnemonic phrase verification.`}
          showConfirmation={true}
        />
      )}

      {(isClaiming || isUpdatingStatus) && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>{progress || "Claiming award..."}</LoadingText>
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

export default ProposalItem;
