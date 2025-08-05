import styled from "styled-components";
import toast from "react-hot-toast";
import CustomButton from "./CustomButton";
import { calculateEpochPhases } from "../scripts/utils/epochPhaseCalculator";
import { useGetEpochsByGroupId } from "../hooks/queries/epochs/useGetEpochsByGroupId";

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
  align-items: center;
  gap: 0.8rem;
  font-size: 1.4rem;
  color: var(--color-grey-300);
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

function ProposalItem({ proposal = {} }) {
  // Fetch epoch data using the group_id from the proposal
  const { epochs, isLoading: isLoadingEpochs } = useGetEpochsByGroupId(
    proposal.group_id
  );

  // Guard clause to handle undefined/null proposal
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

  // Handle opening the document from Pinata
  const handleReviewDetails = () => {
    try {
      // Check if proposal has metadata with ipfs_cid
      if (!proposal.metadata || !proposal.metadata.ipfs_cid) {
        console.warn("No IPFS CID found in proposal metadata");
        toast.error("No document available for this proposal.");
        return;
      }

      const ipfsCid = proposal.metadata.ipfs_cid;

      // Construct the IPFS gateway URL
      // Using Pinata's gateway for better reliability
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;

      console.log("Opening document from IPFS:", ipfsUrl);

      // Open the document in a new window
      window.open(ipfsUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Error opening document. Please try again.");
    }
  };

  // Calculate voting window from epoch data
  const getVotingWindow = () => {
    if (!proposal.epoch_id || !epochs || isLoadingEpochs) {
      return "Voting window not available";
    }

    try {
      // Find the specific epoch for this proposal
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

      // Provide more specific error messages based on error type
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
    <ProposalItemContainer>
      <HeaderSection>
        <LeftSection>
          <ProposalTitle>{proposal.title || "Untitled Proposal"}</ProposalTitle>
          <ProposalDescription>
            {proposal.description || "No description available"}
          </ProposalDescription>
        </LeftSection>
        <RightSection>
          <GroupName>{proposal.group_name || "Unknown Group"}</GroupName>
          <StatusIndicator>
            <StatusDot $status={proposal.status_type || "unknown"} />
            {formatStatus(proposal.status_type)}
          </StatusIndicator>
        </RightSection>
      </HeaderSection>

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
        <VotingWindow>{getVotingWindow()}</VotingWindow>
      </FooterSection>
    </ProposalItemContainer>
  );
}

export default ProposalItem;
