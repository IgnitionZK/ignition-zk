import React, { useState } from "react";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import InboxItem from "../components/InboxItem";
import CustomDropdown from "../components/CustomDropdown";
import CustomButton from "../components/CustomButton";
import { useGetProposalsByGroupId } from "../hooks/queries/proposals/useGetActiveProposalsByGroupId";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useGetProofsByGroupMemberId } from "../hooks/queries/proofs/useGetProofsByGroupMemberId";

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
  font-style: italic;
  margin-bottom: 0.8rem;
  color: var(--color-grey-300);
`;

const HiddenSubtitle = styled.p`
  font-size: 1.6rem;
  font-style: italic;
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
  const groupMemberIds =
    userGroups?.map((group) => group.group_member_id) || [];
  const { proofs } = useGetProofsByGroupMemberId(groupMemberIds);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [isInboxVisible, setIsInboxVisible] = useState(false);

  const groupNames = userGroups?.map((group) => group.name) || [];

  // Filter active proposals and then by selected group
  const filteredProposals = proposals
    ?.filter((proposal) => proposal.status_type === "active")
    .filter((proposal) =>
      selectedGroup === "" ? false : proposal.group_name === selectedGroup
    )
    .filter(
      (proposal) =>
        !proofs?.some((proof) => proof.proposal_id === proposal.proposal_id)
    );

  // Filter verified proposals for activity history
  const verifiedProposals = proposals
    ?.filter((proposal) =>
      proofs?.some(
        (proof) =>
          proof.proposal_id === proposal.proposal_id &&
          proof.is_verified === true
      )
    )
    .filter((proposal) =>
      selectedGroup === "" ? false : proposal.group_name === selectedGroup
    )
    .map((proposal) => ({
      ...proposal,
      is_verified: proofs?.find(
        (proof) => proof.proposal_id === proposal.proposal_id
      )?.is_verified,
    }));

  const handleToggleChange = () => {
    setIsInboxVisible(!isInboxVisible);
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
                $disabled={selectedGroup === ""}
              >
                <ToggleInput
                  type="checkbox"
                  checked={isInboxVisible}
                  onChange={handleToggleChange}
                  disabled={selectedGroup === ""}
                />
                <ToggleSlider $isOn={isInboxVisible} />
              </ToggleSwitch>
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Select a group first, then use toggle to show/hide inbox
                  content
                </Tooltip>
              </InfoIconWrapper>
            </ToggleContainer>
          </LeftSection>
          <CustomDropdown
            options={groupNames}
            selectedOption={selectedGroup}
            onSelect={setSelectedGroup}
            placeholder="Please select group"
          />
        </ControlsRow>
      </PageHeaderContainer>

      {!isInboxVisible ? (
        <HiddenMessage>
          <HiddenTitle>Inbox hidden</HiddenTitle>
          <HiddenSubtitle>
            Select a group using the dropdown and use toggle button to reveal
            inbox items.
          </HiddenSubtitle>
        </HiddenMessage>
      ) : (
        <>
          <Section>
            <ProofHeader>
              <SectionTitle>Pending</SectionTitle>
            </ProofHeader>
            {isLoading || isLoadingGroups ? (
              <div>Loading...</div>
            ) : error ? (
              <div>Error: {error.message}</div>
            ) : (
              <ActivityList>
                {filteredProposals?.map((proposal) => (
                  <InboxItem
                    key={proposal.proposal_id}
                    proposal={proposal}
                    isVerified={false}
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
                  />
                ))}
              </ActivityList>
            )}
          </Section>
        </>
      )}
    </PageContainer>
  );
}
