import React, { useState, useEffect } from "react";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import InboxItem from "../components/InboxItem";
import CustomDropdown from "../components/CustomDropdown";
import MnemonicInput from "../components/MnemonicInput";
import Spinner from "../components/Spinner";

//hooks
import { useGetProposalsByGroupId } from "../hooks/queries/proposals/useGetActiveProposalsByGroupId";
import { useGetPendingInboxProposals } from "../hooks/queries/proposals/useGetPendingInboxProposals";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useGetProofsByGroupMemberId } from "../hooks/queries/proofs/useGetProofsByGroupMemberId";
import { useVerifyMembership } from "../hooks/queries/proofs/useVerifyMembership";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";
import { useValidateGroupCredentials } from "../hooks/queries/groups/useValidateGroupCredentials";

// icons
import { IoIosInformationCircle } from "react-icons/io";

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100%;
  min-width: 55rem;
  color: var(--color-grey-100);
  padding: 0 2rem;
`;

const PageHeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  margin-bottom: 1.6rem;
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 4.8rem;
  height: 2.4rem;
  background-color: ${({ $isOn, $disabled }) => {
    if ($disabled) return "var(--color-grey-700)";
    return $isOn ? "#A5B4FC" : "var(--color-grey-600)";
  }};
  border-radius: 1.2rem;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  transition: background-color 0.3s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  &:hover {
    background-color: ${({ $isOn, $disabled }) => {
      if ($disabled) return "var(--color-grey-700)";
      return $isOn ? "#818CF8" : "var(--color-grey-500)";
    }};
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  top: 0.2rem;
  left: ${({ $isOn }) => ($isOn ? "2.6rem" : "0.2rem")};
  width: 2rem;
  height: 2rem;
  background-color: white;
  border-radius: 50%;
  transition: left 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const HiddenMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40rem;
  text-align: center;
  color: var(--color-grey-300);
`;

const HiddenTitle = styled.h2`
  font-size: 2.4rem;
  margin-bottom: 0.8rem;
  color: var(--color-grey-300);
`;

const HiddenSubtitle = styled.p`
  font-size: 1.6rem;
  color: var(--color-grey-400);
  text-align: center;
  line-height: 1.4;
`;

const ProofHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.6rem;
`;

const Section = styled.div`
  margin-bottom: 3.2rem;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  font-weight: 500;
  margin-bottom: 1.6rem;
  color: var(--color-grey-100);
`;

const ActivityList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const InfoIcon = styled(IoIosInformationCircle)`
  color: #a5b4fc;
  font-size: 1.7rem;
  vertical-align: middle;
`;

const InfoIconWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  &:hover > div {
    opacity: 1;
    visibility: visible;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  top: -3.2rem;
  left: 0;
  min-width: 260px;
  max-width: 340px;
  background: var(--color-grey-800);
  color: var(--color-grey-100);
  padding: 1rem 1.4rem;
  border-radius: 0.6rem;
  font-size: 1.32rem;
  white-space: normal;
  word-break: break-word;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  z-index: 1000;

  &::after {
    content: "";
    position: absolute;
    bottom: -0.5rem;
    left: 1rem;
    border-width: 0.5rem;
    border-style: solid;
    border-color: var(--color-grey-800) transparent transparent transparent;
  }
`;

const CurrentGroupDisplay = styled.div`
  background: var(--color-grey-700);
  color: var(--color-grey-100);
  padding: 0.8rem 1.6rem;
  border: 1px solid var(--color-grey-600);
  border-radius: 0.8rem;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 16rem;
  justify-content: space-between;
`;

const GroupName = styled.span`
  font-weight: 500;
`;

const LockIcon = styled.span`
  color: #22c55e;
  font-size: 1.2rem;
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
 * Proofs component displays a list of pending and verified proposals for the user's groups.
 * It allows filtering proposals by group and shows different sections for pending and verified items.
 * Includes a toggle to show/hide the inbox content.
 *
 * @component
 */
export default function Proofs() {
  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();
  const { isLoading, proposals, error } = useGetProposalsByGroupId(userGroups);
  const {
    isLoading: isLoadingPending,
    proposals: pendingProposals,
    error: pendingError,
  } = useGetPendingInboxProposals(userGroups);
  const groupMemberIds =
    userGroups?.map((group) => group.group_member_id) || [];
  const { proofs } = useGetProofsByGroupMemberId(groupMemberIds);
  const {
    verifyMembership,
    isVerifying,
    error: verificationError,
  } = useVerifyMembership();

  const [selectedGroup, setSelectedGroup] = useState("");
  const [isInboxVisible, setIsInboxVisible] = useState(false);
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [unlockedGroups, setUnlockedGroups] = useState(new Set());
  const [localVerificationError, setLocalVerificationError] = useState(null);
  const [storedMnemonic, setStoredMnemonic] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const groupNames = userGroups?.map((group) => group.name) || [];

  // Get the selected group's ID
  const selectedGroupData = userGroups?.find(
    (group) => group.name === selectedGroup
  );

  const { commitmentArray, isLoading: isLoadingCommitments } =
    useGetCommitmentArray({ groupId: selectedGroupData?.group_id });

  // Get group credentials validation
  const {
    isLoading: isValidatingCredentials,
    isValid: areCredentialsValid,
    totalMembers,
    commitmentsCount,
    message: credentialsMessage,
  } = useValidateGroupCredentials(
    selectedGroupData?.erc721_contract_address,
    selectedGroupData?.group_id,
    !!selectedGroupData
  );

  // Cleanup effect to clear mnemonic when component unmounts or user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      setStoredMnemonic(null);
    };

    // Only clear mnemonic on beforeunload, not on visibility change
    // This allows users to switch tabs without losing their mnemonic
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setStoredMnemonic(null);
    };
  }, []);

  // Filter pending proposals by selected group
  const filteredProposals = pendingProposals?.filter((proposal) =>
    selectedGroup === "" ? false : proposal.group_name === selectedGroup
  );

  // Filter verified proposals for activity history
  const verifiedProposals = proposals
    ?.filter((proposal) => {
      // Check if the user has a verified voting proof for this proposal
      const userVotingProof = proofs?.find(
        (proof) =>
          proof.proposal_id === proposal.proposal_id &&
          proof.circuit_id === "4cf28644-3d5c-4a09-b96d-d3138503ee7d" && // voting circuit
          proof.is_verified === true &&
          proof.group_member_id ===
            userGroups?.find((group) => group.group_id === proposal.group_id)
              ?.group_member_id // match the user's group member ID for this group
      );

      return !!userVotingProof; // only include if user has a verified voting proof
    })
    .filter((proposal) =>
      selectedGroup === "" ? false : proposal.group_name === selectedGroup
    )
    // Get unique proposals, ensuring we get the proposal circuit row for each
    .reduce((acc, proposal) => {
      const existingIndex = acc.findIndex(
        (p) => p.proposal_id === proposal.proposal_id
      );

      if (existingIndex === -1) {
        // First time seeing this proposal_id
        if (proposal.circuit_id === "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52") {
          acc.push(proposal);
        }
      } else {
        // We already have this proposal_id, but check if current row is the proposal circuit
        if (proposal.circuit_id === "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52") {
          // Replace the existing entry with the proposal circuit row
          acc[existingIndex] = proposal;
        }
      }

      return acc;
    }, [])
    .map((proposal) => ({
      ...proposal,
      is_verified: true, // Since we're only including proposals with verified voting proofs
    }));

  const handleToggleChange = () => {
    if (selectedGroup === "") return;

    // Check if credentials are valid before allowing inbox unlock
    if (selectedGroupData && !areCredentialsValid && !isValidatingCredentials) {
      setLocalVerificationError(
        "All group members must generate credentials before unlocking the inbox."
      );
      return;
    }

    if (!unlockedGroups.has(selectedGroup)) {
      setShowMnemonicInput(true);
    } else {
      const newInboxVisible = !isInboxVisible;

      if (newInboxVisible) {
        // If showing the inbox, require mnemonic re-entry even for unlocked groups
        setShowMnemonicInput(true);
      } else {
        // If hiding the inbox, reset the selected group and remove from unlocked groups
        setIsInboxVisible(false);
        setSelectedGroup("");
        setLocalVerificationError(null); // Clear any verification errors
        // Clear all unlocked groups so they need to re-enter mnemonic
        setUnlockedGroups(new Set());
        // Clear stored mnemonic for security
        setStoredMnemonic(null);
      }
    }
  };

  const handleMnemonicSubmit = async (mnemonic) => {
    setShowMnemonicInput(false);
    setLocalVerificationError(null);
    setShowLoadingOverlay(true);

    try {
      if (!commitmentArray) {
        throw new Error("Commitment array not loaded");
      }

      if (!selectedGroupData) {
        throw new Error("Selected group data not found");
      }

      console.log(
        "Verifying membership for group:",
        selectedGroupData.group_id
      );

      // Verify membership using the ZK proof
      const { isValid, publicSignals } = await verifyMembership(
        commitmentArray,
        mnemonic,
        selectedGroupData.group_id
      );

      if (isValid) {
        console.log(
          "Membership verified successfully for group:",
          selectedGroup
        );

        // Only store the mnemonic after successful verification
        setStoredMnemonic(mnemonic);

        // Add the group to unlocked groups (only one group can be unlocked at a time)
        setUnlockedGroups(new Set([selectedGroup]));

        // Show the inbox
        setIsInboxVisible(true);

        console.log("Inbox unlocked for group:", selectedGroup);
      } else {
        throw new Error("Membership verification failed");
      }
    } catch (error) {
      console.error("Membership verification error:", error);
      setLocalVerificationError(error.message || "Failed to verify membership");

      // Don't unlock the inbox if verification fails
      setIsInboxVisible(false);
      // Ensure mnemonic is not stored if verification fails
      setStoredMnemonic(null);
    } finally {
      setShowLoadingOverlay(false);
    }
  };

  const handleMnemonicClose = () => {
    setShowMnemonicInput(false);
  };

  // Check if inbox is visible and group is unlocked (this means dropdown should be hidden)
  const shouldHideDropdown =
    isInboxVisible && unlockedGroups.has(selectedGroup);

  // Handle group selection - only allow if inbox is not visible or group is not unlocked
  const handleGroupSelection = (groupName) => {
    if (shouldHideDropdown) {
      return; // Prevent group switching when inbox is unlocked
    }
    setSelectedGroup(groupName);
  };

  return (
    <PageContainer>
      <PageHeaderContainer>
        <PageHeader title="Inbox" />
        <ControlsRow>
          <LeftSection>
            <ToggleContainer>
              <ToggleSwitch
                $isOn={isInboxVisible}
                $disabled={
                  selectedGroup === "" ||
                  isVerifying ||
                  isValidatingCredentials ||
                  (selectedGroupData && !areCredentialsValid)
                }
              >
                <ToggleInput
                  type="checkbox"
                  checked={isInboxVisible}
                  onChange={handleToggleChange}
                  disabled={
                    selectedGroup === "" ||
                    isVerifying ||
                    isValidatingCredentials ||
                    (selectedGroupData && !areCredentialsValid)
                  }
                />
                <ToggleSlider $isOn={isInboxVisible} />
              </ToggleSwitch>
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  {shouldHideDropdown
                    ? "Group is locked. Toggle off to switch groups or refresh the page."
                    : "Select a group first, then use toggle to unlock inbox content. Re-entry of mnemonic required each time."}
                </Tooltip>
              </InfoIconWrapper>
            </ToggleContainer>
          </LeftSection>
          {!shouldHideDropdown ? (
            <CustomDropdown
              options={groupNames}
              selectedOption={selectedGroup}
              onSelect={handleGroupSelection}
              placeholder="Please select group"
            />
          ) : (
            <CurrentGroupDisplay>
              <GroupName>{selectedGroup}</GroupName>
              <LockIcon>🔒</LockIcon>
            </CurrentGroupDisplay>
          )}
        </ControlsRow>
      </PageHeaderContainer>

      {!isInboxVisible ? (
        <HiddenMessage>
          <HiddenTitle>Inbox hidden</HiddenTitle>
          <HiddenSubtitle>
            {shouldHideDropdown
              ? "Group is locked. Toggle off to switch groups or refresh the page to unlock a different group."
              : "Select a group using the dropdown and use toggle button to reveal inbox items. Mnemonic re-entry required each time."}
          </HiddenSubtitle>

          {/* Loading and error states */}
          {isValidatingCredentials && (
            <div
              style={{
                color: "var(--color-grey-300)",
                fontSize: "1.4rem",
                marginTop: "1.6rem",
                textAlign: "center",
              }}
            >
              Validating group credentials...
            </div>
          )}
          {selectedGroupData &&
            !isValidatingCredentials &&
            !areCredentialsValid && (
              <div
                style={{
                  color: "var(--color-red-400)",
                  fontSize: "1.4rem",
                  marginTop: "1.6rem",
                  textAlign: "center",
                }}
              >
                {credentialsMessage ||
                  "All group members must generate credentials before unlocking the inbox."}
              </div>
            )}
          {localVerificationError && (
            <div
              style={{
                color: "var(--color-red-400)",
                fontSize: "1.4rem",
                marginTop: "1.6rem",
                textAlign: "center",
              }}
            >
              Error: {localVerificationError}
            </div>
          )}
          {isVerifying && (
            <div
              style={{
                color: "var(--color-grey-300)",
                fontSize: "1.4rem",
                marginTop: "1.6rem",
                textAlign: "center",
              }}
            >
              Verifying membership...
            </div>
          )}
        </HiddenMessage>
      ) : (
        <>
          <Section>
            <ProofHeader>
              <SectionTitle>Pending</SectionTitle>
            </ProofHeader>
            {isLoadingPending || isLoadingGroups ? (
              <div>Loading...</div>
            ) : pendingError ? (
              <div>Error: {pendingError.message}</div>
            ) : (
              <ActivityList>
                {filteredProposals?.map((proposal) => (
                  <InboxItem
                    key={proposal.proposal_id}
                    proposal={proposal}
                    isVerified={false}
                    storedMnemonic={storedMnemonic}
                  />
                ))}
              </ActivityList>
            )}
          </Section>
          <Section>
            <SectionTitle>Verified</SectionTitle>
            {isLoading || isLoadingGroups ? (
              <div>Loading...</div>
            ) : error ? (
              <div>Error: {error.message}</div>
            ) : (
              <ActivityList>
                {verifiedProposals?.map((proposal) => (
                  <InboxItem
                    key={proposal.proposal_id}
                    proposal={proposal}
                    showSubmitButton={false}
                    isVerified={proposal.is_verified}
                    storedMnemonic={storedMnemonic}
                  />
                ))}
              </ActivityList>
            )}
          </Section>
        </>
      )}
      {showMnemonicInput && (
        <MnemonicInput
          title="Unlock Inbox"
          subtitle="Enter your mnemonic phrase to unlock inbox items for this group"
          wordCount={12}
          contextInfo={{
            groupName: selectedGroup,
          }}
          onClose={handleMnemonicClose}
          onSubmit={handleMnemonicSubmit}
          confirmButtonText="Unlock"
          cancelButtonText="Cancel"
          confirmationMessage={`Are you sure you want to unlock the inbox for "${selectedGroup}"? This will require your mnemonic phrase verification.`}
          showConfirmation={true}
        />
      )}

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>Verifying membership...</LoadingText>
          <LoadingText
            style={{
              fontSize: "1.4rem",
              marginTop: "0.8rem",
              color: "var(--color-grey-300)",
            }}
          >
            This may take a few moments.
          </LoadingText>
        </LoadingOverlay>
      )}
    </PageContainer>
  );
}
