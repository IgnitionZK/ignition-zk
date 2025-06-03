import styled from "styled-components";
import { useWallet } from "../hooks/wallet/useWallet";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { RiDeleteBack2Fill } from "react-icons/ri";
import { useState } from "react";

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

const GroupItem = styled.li`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
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

function Dashboard() {
  const { connect, address } = useWallet();
  const { isLoading, userGroups, error } = useGetUserGroups();
  const [searchQuery, setSearchQuery] = useState("");

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
          <h2>Your Groups</h2>
          <SearchInput
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </GroupsHeader>
        {isLoading ? (
          <p>Loading groups...</p>
        ) : error ? (
          <p>Error loading groups: {error.message}</p>
        ) : (
          <GroupsList>
            {userGroups?.map((group) => (
              <GroupItem key={group.name}>
                <GroupInfo>
                  <GroupName>{group.name}</GroupName>
                  <ContractAddress>
                    {group.erc721_contract_address}
                  </ContractAddress>
                </GroupInfo>
                <DeleteButton>
                  <RiDeleteBack2Fill />
                  <Tooltip>Leave group</Tooltip>
                </DeleteButton>
              </GroupItem>
            ))}
          </GroupsList>
        )}
      </Content>
    </DashboardContainer>
  );
}

export default Dashboard;
