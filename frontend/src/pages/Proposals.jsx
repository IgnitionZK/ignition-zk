import React, { useState, useEffect } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";

// components
import PageHeader from "../components/PageHeader";
import ProposalItem from "../components/ProposalItem";
import CustomDropdown from "../components/CustomDropdown";
import { useGetProposalsByGroupId } from "../hooks/queries/proposals/useGetActiveProposalsByGroupId";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import CustomButtonIcon from "../components/CustomButtonIcon";
import CreateProposal from "./CreateProposal";

// icon
import { FaCirclePlus } from "react-icons/fa6";

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
 * Proposals page component that displays active and historical proposals for user groups.
 * Shows active proposals with filtering by group, allows creation of new proposals,
 * and displays proposal activity history.
 */
export default function Proposals() {
  const { userGroups, isLoading: isLoadingGroups } = useGetUserGroups();
  const { isLoading, proposals, error, refetch } =
    useGetProposalsByGroupId(userGroups);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedGroup, setSelectedGroup] = useState("All Groups");

  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  const groupNames = [
    "All Groups",
    ...(userGroups?.map((group) => group.name) || []),
  ];

  const activeProposals = proposals
    ?.filter((proposal) => proposal.status_type === "active")
    .filter((proposal) =>
      selectedGroup === "All Groups"
        ? true
        : proposal.group_name === selectedGroup
    );

  const filteredProposals = activeProposals?.reduce((acc, proposal) => {
    const existingIndex = acc.findIndex(
      (p) => p.proposal_id === proposal.proposal_id
    );

    if (existingIndex === -1) {
      if (proposal.circuit_id === "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52") {
        acc.push(proposal);
      }
    } else {
      if (proposal.circuit_id === "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52") {
        acc[existingIndex] = proposal;
      }
    }

    return acc;
  }, []);

  if (showCreateProposal) {
    return (
      <CreateProposal
        onSuccess={async (proposalTitle) => {
          setShowCreateProposal(false);
          toast.success(`Successfully created "${proposalTitle}"!`);

          // Increment refresh key to trigger automatic refetch via useEffect
          setRefreshKey((prev) => prev + 1);
        }}
        onCancel={() => {
          setShowCreateProposal(false);
        }}
      />
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Proposals" />
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
          <ActivityList key={`active-${refreshKey}`}>
            {filteredProposals?.map((proposal) => (
              <ProposalItem
                key={`active-${proposal.proposal_id}`}
                proposal={proposal}
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
          <ActivityList key={`history-${refreshKey}`}>
            {(() => {
              const historyProposals = proposals
                ?.filter((proposal) => proposal.status_type !== "active")
                .filter((proposal) =>
                  selectedGroup === "All Groups"
                    ? true
                    : proposal.group_name === selectedGroup
                );

              const filteredHistoryProposals = historyProposals?.reduce(
                (acc, proposal) => {
                  const existingIndex = acc.findIndex(
                    (p) => p.proposal_id === proposal.proposal_id
                  );

                  if (existingIndex === -1) {
                    if (
                      proposal.circuit_id ===
                      "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52"
                    ) {
                      acc.push(proposal);
                    }
                  } else {
                    if (
                      proposal.circuit_id ===
                      "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52"
                    ) {
                      acc[existingIndex] = proposal;
                    }
                  }

                  return acc;
                },
                []
              );

              return filteredHistoryProposals?.map((proposal) => (
                <ProposalItem
                  key={`history-${proposal.proposal_id}`}
                  proposal={proposal}
                />
              ));
            })()}
          </ActivityList>
        )}
      </Section>
    </PageContainer>
  );
}
