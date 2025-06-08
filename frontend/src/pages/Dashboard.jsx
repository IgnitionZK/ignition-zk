import styled from "styled-components";
import { useWallet } from "../hooks/wallet/useWallet";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useSearchGroups } from "../hooks/queries/groups/useSearchGroups";
import { useState, useMemo, useEffect } from "react";
import GroupItem from "../components/GroupItem";
import SearchResultItemComponent from "../components/SearchResultItem";
import { useQueryClient } from "@tanstack/react-query";
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
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--color-grey-100);
`;

const CustomButton = styled.button`
  background-color: #a5b4fc;
  color: #232328;
  padding: 1rem 2rem;
  border: none;
  border-radius: 0.8rem;
  font-size: 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #818cf8;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const ConnectedAddress = styled.span`
  font-size: 1.6rem;
  color: var(--color-grey-100);
  background-color: rgba(165, 180, 252, 0.1);
  padding: 0.8rem 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
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

const GroupInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
`;

const GroupName = styled.span`
  font-weight: 500;
`;

const ContractAddress = styled.span`
  color: var(--color-grey-400);
  font-size: 1.4rem;
  font-family: monospace;
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

const GroupsHeader = styled.div`
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

  const { connect, address } = useWallet();
  const { isLoading, userGroups, error } = useGetUserGroups();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useSearchGroups({
    name: searchQuery,
  });

  /*
  // User1 test1@mail.com
  const mnemonic_user1 =
    "immune common syrup eight obscure include cake wagon night bid orange blind";

  const commitment_array = [
    "18301975437076688951605982531442620507009188043025261735726303471281552796279",
    "19128431862593125093240678832526009953834018963693806080768561024152237934378",
    "10200179915901109051215990462616205975059062619217578594631574969177607770325",
  ];

  // User1 test1@mail.com
  const circuit_input = {
    root: "2816585570619196139655348047484435893091094801877254464923708610492590781282",
    identityTrapdoor:
      "9109860484713997389815813865890940697541906977365513876682157576418033000907",
    identityNullifier:
      "6627303547329083424155582496678458456973465494207453192673926270522418522677",
    pathElements: [
      "19128431862593125093240678832526009953834018963693806080768561024152237934378",
      "14485952114445967997386297493910978720262437504247518805107638030076024277901",
      "7423237065226347324353380772367382631490014989348495481811164164159255474657",
      "11286972368698509976183087595462810875513684078608517520839298933882497716792",
      "3607627140608796879659380071776844901612302623152076817094415224584923813162",
      "19712377064642672829441595136074946683621277828620209496774504837737984048981",
      "20775607673010627194014556968476266066927294572720319469184847051418138353016",
      "3396914609616007258851405644437304192397291162432396347162513310381425243293",
      "21551820661461729022865262380882070649935529853313286572328683688269863701601",
      "6573136701248752079028194407151022595060682063033565181951145966236778420039",
    ],
    pathIndices: ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
  };

  // Test generateCircuitInput and generateProof
  useEffect(() => {
    const testCircuitInputAndProof = async () => {
      try {
        console.log("Starting circuit input generation...");
        const generatedCircuitInput =
          await ZKProofGenerator.generateCircuitInput(
            mnemonic_user1,
            commitment_array.map((value) => BigInt(value))
          );
        console.log("Circuit input generated:", generatedCircuitInput);

        console.log("Starting proof generation with generated input...");
        const { proof, publicSignals } = await ZKProofGenerator.generateProof(
          generatedCircuitInput
        );
        console.log("Proof generated successfully");

        console.log("Starting off-chain verification...");
        const isValid = await ZKProofGenerator.verifyProofOffChain(
          proof,
          publicSignals
        );
        console.log("Off-chain verification result:", isValid);
      } catch (error) {
        console.error("Error in circuit input generation or proof:", error);
      }
    };

    testCircuitInputAndProof();
  }, []);
  */

  // Filter out groups that user has already joined
  const filteredSearchResults = useMemo(() => {
    if (!searchResults || !userGroups) return [];

    const userGroupIds = new Set(userGroups.map((group) => group.group_id));
    return searchResults.filter((group) => !userGroupIds.has(group.group_id));
  }, [searchResults, userGroups]);

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleJoinSuccess = () => {
    // Invalidate and refetch user groups
    queryClient.invalidateQueries(["userGroups"]);
    // Clear search
    setSearchQuery("");
  };

  return (
    <DashboardContainer>
      <Header>
        <Title>Welcome!</Title>
        {address ? (
          <ConnectedAddress>
            Connected: {formatAddress(address)}
          </ConnectedAddress>
        ) : (
          <CustomButton onClick={connect}>Connect MetaMask</CustomButton>
        )}
      </Header>
      <Content>
        <GroupsHeader>
          <SectionTitle>Search Groups</SectionTitle>
          <SearchInput
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </GroupsHeader>

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
