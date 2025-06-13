import React, { useState } from "react";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import ProposalItem from "../components/ProposalItem";
import CustomDropdown from "../components/CustomDropdown";
import { useGetProposalsByGroupId } from "../hooks/queries/proposals/useGetActiveProposalsByGroupId";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";

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
 * Proposals page component that displays active and historical proposals
 * @component
 */
export default function Proposals() {
  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();
  const { isLoading, proposals, error } = useGetProposalsByGroupId(userGroups);

  const [selectedGroup, setSelectedGroup] = useState("All Groups");

  const groupNames = [
    "All Groups",
    ...(userGroups?.map((group) => group.name) || []),
  ];

  // Filter active proposals and then by selected group
  const filteredProposals = proposals
    ?.filter((proposal) => proposal.status === "active")
    .filter((proposal) =>
      selectedGroup === "All Groups"
        ? true
        : proposal.group_name === selectedGroup
    );

  return (
    <PageContainer>
      <PageHeader title="" />
      <Section>
        <ProofHeader>
          <SectionTitle> Active </SectionTitle>
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
              <ProposalItem
                key={proposal.proposal_id}
                proposal={proposal}
                showSubmitButton={false}
              />
            ))}
          </ActivityList>
        )}
      </Section>
      <Section>
        <SectionTitle>Activity History</SectionTitle>
        {isLoading || isLoadingGroups ? (
          <div>Loading...</div>
        ) : error ? (
          <div>Error: {error.message}</div>
        ) : (
          <ActivityList>
            {proposals
              ?.filter((proposal) => proposal.status !== "active")
              .filter((proposal) =>
                selectedGroup === "All Groups"
                  ? true
                  : proposal.group_name === selectedGroup
              )
              .map((proposal) => (
                <ProposalItem
                  key={proposal.proposal_id}
                  proposal={proposal}
                  showSubmitButton={false}
                />
              ))}
          </ActivityList>
        )}
      </Section>
    </PageContainer>
  );
}
