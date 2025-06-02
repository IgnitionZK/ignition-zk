import styled from "styled-components";
import { useWallet } from "../hooks/wallet/useWallet";
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100%;
  color: var(--color-grey-100);
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

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

function Dashboard() {
  const { connect, address } = useWallet();
  const { isLoading, userGroups, error } = useGetUserGroups();

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
        <h2>Your Groups</h2>
        {isLoading ? (
          <p>Loading groups...</p>
        ) : error ? (
          <p>Error loading groups: {error.message}</p>
        ) : (
          <GroupsList>
            {userGroups?.map((group) => (
              <GroupItem key={group.name}>{group.name}</GroupItem>
            ))}
          </GroupsList>
        )}
      </Content>
    </DashboardContainer>
  );
}

export default Dashboard;
