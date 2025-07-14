import React, { useState } from "react";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import ProposalItem from "../components/ProposalItem";
import CustomDropdown from "../components/CustomDropdown";
import { useGetProposalsByGroupId } from "../hooks/queries/proposals/useGetActiveProposalsByGroupId";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import CustomButtonIcon from "../components/CustomButtonIcon";

// icon
import { FaCirclePlus } from "react-icons/fa6";
import CreateProposal from "./CreateProposal";

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

const ProofHeader = styled.div`
  display: flex;
  justify-content: flex-end;
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

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.6rem;
`;

const SectionTitleInline = styled.h2`
  font-size: 2rem;
  font-weight: 500;
  color: var(--color-grey-100);
  margin: 0;
`;

/**
 * Proposals page component that displays active and historical proposals
 * @component
 */
export default function Proposals() {
  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();
  const { isLoading, proposals, error } = useGetProposalsByGroupId(userGroups);
  const [showCreateProposal, setShowCreateProposal] = useState(false);

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
    );

  if (showCreateProposal) {
    return <CreateProposal />;
  }

  return (
    <PageContainer>
      <PageHeader title="" />
      <Section>
        <ProofHeader>
          <CustomDropdown
            options={groupNames}
            selectedOption={selectedGroup}
            onSelect={setSelectedGroup}
            placeholder="All Groups"
          />
        </ProofHeader>
        <SectionHeader>
          <SectionTitleInline>Active</SectionTitleInline>
          <CustomButtonIcon
            icon={FaCirclePlus}
            tooltipText="Create new proposal"
            onClick={() => {
              setShowCreateProposal(true);
            }}
          />
        </SectionHeader>
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
              ?.filter((proposal) => proposal.status_type !== "active")
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
