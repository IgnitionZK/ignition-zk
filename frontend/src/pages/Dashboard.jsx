import styled from "styled-components";

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

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

function Dashboard() {
  return (
    <DashboardContainer>
      <Header>
        <Title>Welcome!</Title>
      </Header>
      <Content>
        <h1>Content</h1>
      </Content>
    </DashboardContainer>
  );
}

export default Dashboard;
