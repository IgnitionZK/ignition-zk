import React, { useState } from "react";
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

  // Filter active proposals that have proposal proofs, then by selected group
  const activeProposals = proposals
    ?.filter((proposal) => proposal.status_type === "active")
    .filter((proposal) =>
      selectedGroup === "All Groups"
        ? true
        : proposal.group_name === selectedGroup
    );

  const filteredProposals = activeProposals
    // Get unique proposals, ensuring we get the proposal circuit row for each
    ?.reduce((acc, proposal) => {
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
    }, []);

  if (showCreateProposal) {
    return (
      <CreateProposal
        onSuccess={(proposalTitle) => {
          setShowCreateProposal(false);
          toast.success(`Successfully created "${proposalTitle}"!`);
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
          <ActivityList>
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
          <ActivityList>
            {(() => {
              const historyProposals = proposals
                ?.filter((proposal) => proposal.status_type !== "active")
                .filter((proposal) =>
                  selectedGroup === "All Groups"
                    ? true
                    : proposal.group_name === selectedGroup
                );

              const filteredHistoryProposals = historyProposals
                // Get unique proposals, ensuring we get the proposal circuit row for each
                ?.reduce((acc, proposal) => {
                  const existingIndex = acc.findIndex(
                    (p) => p.proposal_id === proposal.proposal_id
                  );

                  if (existingIndex === -1) {
                    // First time seeing this proposal_id
                    if (
                      proposal.circuit_id ===
                      "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52"
                    ) {
                      acc.push(proposal);
                    }
                  } else {
                    // We already have this proposal_id, but check if current row is the proposal circuit
                    if (
                      proposal.circuit_id ===
                      "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52"
                    ) {
                      // Replace the existing entry with the proposal circuit row
                      acc[existingIndex] = proposal;
                    }
                  }

                  return acc;
                }, []);

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
