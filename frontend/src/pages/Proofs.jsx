import React, { useState } from "react";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import InboxItem from "../components/InboxItem";
import CustomDropdown from "../components/CustomDropdown";
import { useGetProposalsByGroupId } from "../hooks/queries/proposals/useGetActiveProposalsByGroupId";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useGetProofsByGroupMemberId } from "../hooks/queries/proofs/useGetProofsByGroupMemberId";

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

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
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

/**
 * Proofs component displays a list of pending and verified proposals for the user's groups.
 * It allows filtering proposals by group and shows different sections for pending and verified items.
 *
 * @component
 */
export default function Proofs() {
  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();
  const { isLoading, proposals, error } = useGetProposalsByGroupId(userGroups);
  const groupMemberIds =
    userGroups?.map((group) => group.group_member_id) || [];
  const {
    isLoading: isLoading2,
    proofs,
    error: err,
  } = useGetProofsByGroupMemberId(groupMemberIds);

  const [selectedGroup, setSelectedGroup] = useState("All Groups");

  const groupNames = [
    "All Groups",
    ...(userGroups?.map((group) => group.name) || []),
  ];

  // Filter active proposals and then by selected group
  const filteredProposals = proposals
    ?.filter((proposal) => proposal.status_type === "active")
    .filter((proposal) =>
      selectedGroup === "All Groups"
        ? true
        : proposal.group_name === selectedGroup
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
      selectedGroup === "All Groups"
        ? true
        : proposal.group_name === selectedGroup
    )
    .map((proposal) => ({
      ...proposal,
      is_verified: proofs?.find(
        (proof) => proof.proposal_id === proposal.proposal_id
      )?.is_verified,
    }));

  return (
    <PageContainer>
      <PageHeader title="" />
      <Section>
        <ProofHeader>
          <SectionTitle> Pending </SectionTitle>
          <CustomDropdown
            options={groupNames}
            selectedOption={selectedGroup}
            onSelect={setSelectedGroup}
            placeholder="All Groups"
          />
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
    </PageContainer>
  );
}
