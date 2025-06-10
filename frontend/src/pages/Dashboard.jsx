import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { useState, useMemo } from "react";

// custom hooks
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useSearchGroups } from "../hooks/queries/groups/useSearchGroups";

//components
import GroupItem from "../components/GroupItem";
import SearchResultItemComponent from "../components/SearchResultItem";
import PageHeader from "../components/PageHeader";

// scripts
import { ZKProofGenerator } from "../scripts/generateZKProof-browser-safe";

const DashboardContainer = styled.div`
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

const GroupsList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const DeleteButton = styled.div`
  position: relative;
  cursor: pointer;

  svg {
    color: var(--color-grey-100);
    font-size: 2rem;
    transition: color 0.2s ease-in-out;
  }

  &:hover {
    svg {
      color: var(--color-red-500);
    }
  }
`;

const Tooltip = styled.div`
  position: absolute;
  right: 0;
  top: -3rem;
  background-color: var(--color-grey-800);
  color: var(--color-grey-100);
  padding: 0.8rem 1.2rem;
  border-radius: 0.4rem;
  font-size: 1.4rem;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;

  ${DeleteButton}:hover & {
    opacity: 1;
    visibility: visible;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -0.5rem;
    right: 1rem;
    border-width: 0.5rem;
    border-style: solid;
    border-color: var(--color-grey-800) transparent transparent transparent;
  }
`;

const SearchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.6rem;
`;

const SearchInput = styled.input`
  background-color: rgba(165, 180, 252, 0.1);
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 0.8rem;
  padding: 0.8rem 1.2rem;
  color: var(--color-grey-100);
  font-size: 1.4rem;
  width: 24rem;
  transition: all 0.2s ease-in-out;

  &::placeholder {
    color: var(--color-grey-400);
  }

  &:focus {
    outline: none;
    border-color: rgba(165, 180, 252, 0.4);
    background-color: rgba(165, 180, 252, 0.15);
  }
`;

const SearchResults = styled.div`
  margin-top: 2rem;
`;

const SearchResultsTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 1.2rem;
`;

const ErrorMessage = styled.p`
  color: var(--color-red-500);
  font-size: 1.4rem;
  margin-top: 0.8rem;
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

/**
 * Dashboard component that displays user's groups and allows searching for new groups
 */
function Dashboard() {
  const queryClient = useQueryClient();

  const { isLoading, userGroups, error } = useGetUserGroups();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSearchGroups({
    name: searchQuery,
  });

  // Filter out groups that user has already joined
  const filteredSearchResults = useMemo(() => {
    if (!searchResults || !userGroups) return [];

    const userGroupIds = new Set(userGroups.map((group) => group.group_id));
    return searchResults.filter((group) => !userGroupIds.has(group.group_id));
  }, [searchResults, userGroups]);

  const handleJoinSuccess = () => {
    // Invalidate and refetch user groups
    queryClient.invalidateQueries(["userGroups"]);
    // Clear search
    setSearchQuery("");
  };

  return (
    <DashboardContainer>
      <PageHeader title="Welcome!" />
      <Content>
        <SearchHeader>
          <SectionTitle>Search Groups</SectionTitle>
          <SearchInput
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchHeader>

        {searchQuery && (
          <Section>
            {isSearching ? (
              <p>Searching...</p>
            ) : searchError ? (
              <ErrorMessage>
                Error searching groups: {searchError.message}
              </ErrorMessage>
            ) : filteredSearchResults.length === 0 ? (
              <p>No new groups found</p>
            ) : (
              <GroupsList>
                {filteredSearchResults.map((group) => (
                  <SearchResultItemComponent
                    key={group.group_id}
                    group={group}
                    onJoinSuccess={handleJoinSuccess}
                  />
                ))}
              </GroupsList>
            )}
          </Section>
        )}

        <Section>
          <SectionTitle>Your Groups</SectionTitle>
          {isLoading ? (
            <p>Loading groups...</p>
          ) : error ? (
            <ErrorMessage>Error loading groups: {error.message}</ErrorMessage>
          ) : (
            <GroupsList>
              {userGroups?.map((group) => (
                <GroupItem
                  key={group.group_id}
                  group={group}
                  groupId={group.group_id}
                  groupMemberId={group.group_member_id}
                />
              ))}
            </GroupsList>
          )}
        </Section>
      </Content>
    </DashboardContainer>
  );
}

export default Dashboard;
