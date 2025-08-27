import React, { useState, useEffect } from "react";
import styled from "styled-components";

// Components
import PageHeader from "../components/PageHeader";
import CustomDropdown from "../components/CustomDropdown";
import MnemonicInput from "../components/MnemonicInput";
import Spinner from "../components/Spinner";
import InboxItem from "../components/InboxItem";

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
  const isDevelopmentMode = false; // Set to false when deploying

  // Circuit IDs for different proof types
  const PROPOSAL_CIRCUIT_ID = "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52";
  const VOTING_CIRCUIT_ID = "4cf28644-3d5c-4a09-b96d-d3138503ee7d";

  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();

  const {
    verifyMembership,
    isVerifying,
    error: verificationError,
  } = useVerifyMembership();

  const groupIds = userGroups?.map((group) => group.group_id) || [];
  const groupMemberIds =
    userGroups?.map((group) => group.group_member_id) || [];
  const {
    proofs,
    isLoading: isLoadingProofs,
    error: proofsError,
  } = useGetProofsByGroupIds(groupIds, groupMemberIds);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [isInboxVisible, setIsInboxVisible] = useState(false);
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [unlockedGroups, setUnlockedGroups] = useState(new Set());
  const [localVerificationError, setLocalVerificationError] = useState(null);
  const [storedMnemonic, setStoredMnemonic] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const groupNames = userGroups?.map((group) => group.name) || [];

  const selectedGroupData = userGroups?.find(
    (group) => group.name === selectedGroup
  );

  const selectedGroupProofs =
    proofs?.filter((proof) => proof.group_id === selectedGroupData?.group_id) ||
    [];

  const currentUserGroupMemberId = selectedGroupData?.group_member_id;

  const proposalProofs = selectedGroupProofs.filter(
    (proof) => proof.circuit_id === PROPOSAL_CIRCUIT_ID
  );

  const votingProofs = selectedGroupProofs.filter(
    (proof) => proof.circuit_id === VOTING_CIRCUIT_ID
  );

  const pendingProposals = proposalProofs.filter((proposalProof) => {
    const hasUserVoted = votingProofs.some(
      (votingProof) =>
        votingProof.proposal_id === proposalProof.proposal_id &&
        votingProof.group_member_id === currentUserGroupMemberId
    );

    return !hasUserVoted;
  });

  const verifiedProposals = proposalProofs.filter((proposalProof) => {
    const userVotingProof = votingProofs.find(
      (votingProof) =>
        votingProof.proposal_id === proposalProof.proposal_id &&
        votingProof.group_member_id === currentUserGroupMemberId
    );

    return userVotingProof && userVotingProof.is_verified;
  });

  const verifiedVotingOnlyProposals = votingProofs
    .filter((votingProof) => {
      return (
        votingProof.group_member_id === currentUserGroupMemberId &&
        votingProof.is_verified
      );
    })
    .filter((votingProof) => {
      return !proposalProofs.some(
        (proposalProof) => proposalProof.proposal_id === votingProof.proposal_id
      );
    })
    .map((votingProof) => {
      return {
        proof_id: votingProof.proof_id,
        proposal_id: votingProof.proposal_id,
        title: votingProof.proposal_title || "Proposal Title Unavailable",
        group_name: votingProof.group_name || "Unknown Group",
        description:
          votingProof.proposal_description ||
          "Proposal description unavailable",
        epoch_start_time: votingProof.epoch_start_time,
        epoch_duration: votingProof.epoch_duration,
        is_voting_only: true,
      };
    });

  const allVerifiedProposals = [
    ...verifiedProposals,
    ...verifiedVotingOnlyProposals,
  ];

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

  useEffect(() => {
    const handleBeforeUnload = () => {
      setStoredMnemonic(null);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setStoredMnemonic(null);
    };
  }, []);

  const handleGroupSelect = (groupName) => {
    setSelectedGroup(groupName);
  };

  const handleToggleChange = () => {
    if (selectedGroup === "") return;

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
        setShowMnemonicInput(true);
      } else {
        setIsInboxVisible(false);
        setSelectedGroup("");
        setLocalVerificationError(null);

        setUnlockedGroups(new Set());

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

      const { isValid, publicSignals } = await verifyMembership(
        commitmentArray,
        mnemonic,
        selectedGroupData.group_id
      );

      if (isValid) {
        setStoredMnemonic(mnemonic);

        setUnlockedGroups(new Set([selectedGroup]));

        setIsInboxVisible(true);
      } else {
        throw new Error("Membership verification failed");
      }
    } catch (error) {
      console.error("Membership verification error:", error);
      setLocalVerificationError(error.message || "Failed to verify membership");

      setIsInboxVisible(false);

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
                  Re-entry of mnemonic required each time. Once unlocked, the
                  group dropdown will be disabled until you lock the inbox.
                </Tooltip>
              </InfoIconWrapper>
            </ToggleContainer>
          </LeftSection>
          <CustomDropdown
            options={groupNames}
            selectedOption={selectedGroup}
            onSelect={handleGroupSelect}
            placeholder="Please select group"
            disabled={isInboxVisible}
            disabledMessage="Lock inbox to switch groups"
          />
        </ControlsRow>
      </PageHeaderContainer>

      {!isInboxVisible ? (
        <HiddenMessage>
          <HiddenTitle>Inbox hidden</HiddenTitle>
          <HiddenSubtitle>
            Select a group using the dropdown and use toggle button to reveal
            inbox items. Mnemonic re-entry required each time. Once unlocked,
            you must lock the inbox before switching to another group.
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
        <>
          <Section>
            <ProofHeader>
              <SectionTitle>Pending</SectionTitle>
            </ProofHeader>
            {isLoadingProofs || isLoadingGroups ? (
              <div>Loading...</div>
            ) : proofsError ? (
              <div>Error: {proofsError.message}</div>
            ) : pendingProposals.length === 0 ? (
              <div
                style={{
                  color: "var(--color-grey-400)",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                No pending proposals
              </div>
            ) : (
              <ActivityList>
                {pendingProposals.map((proposalProof) => (
                  <InboxItem
                    key={proposalProof.proof_id}
                    proposal={{
                      title: proposalProof.proposal_title,
                      group_name: proposalProof.group_name,
                      description: proposalProof.proposal_description,
                      epoch_start_time: proposalProof.epoch_start_time,
                      epoch_duration: proposalProof.epoch_duration,
                      group_id: proposalProof.group_id,
                      proposal_id: proposalProof.proposal_id,
                      epoch_id: proposalProof.epoch_id,
                      payload: proposalProof.proposal_payload || {},
                      funding: proposalProof.proposal_funding || {},
                      metadata: proposalProof.proposal_metadata || {},
                    }}
                    showSubmitButton={true}
                    storedMnemonic={storedMnemonic}
                    refetchPendingProposals={() => {
                      console.log("Refetching pending proposals...");
                    }}
                    refetchProofs={() => {
                      console.log("Refetching proofs...");
                    }}
                  />
                ))}
              </ActivityList>
            )}
          </Section>
          <Section>
            <SectionTitle>Verified</SectionTitle>
            {isLoadingProofs || isLoadingGroups ? (
              <div>Loading...</div>
            ) : proofsError ? (
              <div>Error: {proofsError.message}</div>
            ) : allVerifiedProposals.length === 0 ? (
              <div
                style={{
                  color: "var(--color-grey-400)",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                No verified proposals
              </div>
            ) : (
              <ActivityList>
                {allVerifiedProposals.map((proposalProof) => (
                  <InboxItem
                    key={proposalProof.proof_id}
                    proposal={{
                      title: proposalProof.proposal_title,
                      group_name: proposalProof.group_name,
                      description: proposalProof.proposal_description,
                      epoch_start_time: proposalProof.epoch_start_time,
                      epoch_duration: proposalProof.epoch_duration,
                      group_id: proposalProof.group_id,
                      proposal_id: proposalProof.proposal_id,
                      epoch_id: proposalProof.epoch_id,
                      payload: proposalProof.proposal_payload || {},
                      funding: proposalProof.proposal_funding || {},
                      metadata: proposalProof.proposal_metadata || {},
                    }}
                    showSubmitButton={false}
                    storedMnemonic={storedMnemonic}
                    refetchPendingProposals={() => {
                      console.log("Refetching pending proposals...");
                    }}
                    refetchProofs={() => {
                      console.log("Refetching proofs...");
                    }}
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
