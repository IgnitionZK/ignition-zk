import React, { useState, useEffect } from "react";
import styled from "styled-components";

// Components
import PageHeader from "../components/PageHeader";
import CustomDropdown from "../components/CustomDropdown";
import MnemonicInput from "../components/MnemonicInput";
import Spinner from "../components/Spinner";

// Hooks
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";

// hooks for verify membership toggle functionality
import { useVerifyMembership } from "../hooks/queries/proofs/useVerifyMembership";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";
import { useValidateGroupCredentials } from "../hooks/queries/groups/useValidateGroupCredentials";

// hook for getting proofs by group IDs
import { useGetProofsByGroupIds } from "../hooks/queries/proofs/useGetProofsByGroupIds";

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

const InfoIconWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
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
 * Inbox component displays a list of pending and verified proposals for the user's groups.
 * It allows filtering proposals by group and shows different sections for pending and verified items.
 * Includes a toggle to show/hide the inbox content.
 *
 * @component
 */
export default function Inbox() {
  const isDevelopmentMode = true; // Set to false when deploying

  // hooks
  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();
  console.log(userGroups);

  const {
    verifyMembership,
    isVerifying,
    error: verificationError,
  } = useVerifyMembership();

  // Get proofs by group IDs
  const groupIds = userGroups?.map((group) => group.group_id) || [];
  const groupMemberIds =
    userGroups?.map((group) => group.group_member_id) || [];
  const {
    proofs,
    isLoading: isLoadingProofs,
    error: proofsError,
  } = useGetProofsByGroupIds(groupIds, groupMemberIds);

  // Log proofs data to console
  console.log("Proofs by group IDs:", proofs);
  console.log("Proofs loading:", isLoadingProofs);
  console.log("Proofs error:", proofsError);
  console.log("Group IDs:", groupIds);
  console.log("Group member IDs:", groupMemberIds);

  // state
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isInboxVisible, setIsInboxVisible] = useState(false);
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [unlockedGroups, setUnlockedGroups] = useState(new Set());
  const [localVerificationError, setLocalVerificationError] = useState(null);
  const [storedMnemonic, setStoredMnemonic] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  // derived state
  const groupNames = userGroups?.map((group) => group.name) || [];
  console.log(groupNames);

  const selectedGroupData = userGroups?.find(
    (group) => group.name === selectedGroup
  );

  const { commitmentArray, isLoading: isLoadingCommitments } =
    useGetCommitmentArray({ groupId: selectedGroupData?.group_id });

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

  // placeholder function for onSelect
  const handleGroupSelect = (groupName) => {
    setSelectedGroup(groupName);
    console.log("Selected group:", groupName);
  };

  // Toggle functionality with membership verification
  const handleToggleChange = () => {
    if (selectedGroup === "") return;

    // Add this early return for development mode
    if (isDevelopmentMode) {
      setIsInboxVisible(!isInboxVisible);
      if (!isInboxVisible) {
        setUnlockedGroups(new Set([selectedGroup]));
        setStoredMnemonic("");
      }
      return;
    }

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
                <Tooltip>
                  Select a group first, then use toggle to unlock inbox content.
                  Re-entry of mnemonic required each time.
                </Tooltip>
              </InfoIconWrapper>
            </ToggleContainer>
          </LeftSection>
          <CustomDropdown
            options={groupNames}
            selectedOption={selectedGroup}
            onSelect={handleGroupSelect}
            placeholder="Please select group"
          />
        </ControlsRow>
      </PageHeaderContainer>

      {!isInboxVisible ? (
        <HiddenMessage>
          <HiddenTitle>Inbox hidden</HiddenTitle>
          <HiddenSubtitle>
            Select a group using the dropdown and use toggle button to reveal
            inbox items. Mnemonic re-entry required each time.
          </HiddenSubtitle>
          {localVerificationError && (
            <div
              style={{
                color: "var(--color-red-500)",
                fontSize: "1.4rem",
                marginTop: "1.6rem",
                textAlign: "center",
                maxWidth: "40rem",
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
        <div>
          {/* InboxItems will be implemented here later */}
          <p>Inbox content will be displayed here</p>
        </div>
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
