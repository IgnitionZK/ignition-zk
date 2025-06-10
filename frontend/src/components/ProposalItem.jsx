import styled from "styled-components";

const ProposalItemContainer = styled.li`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

const ProposalInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const ProposalName = styled.span`
  font-weight: 500;
`;

const CreatedAt = styled.span`
  color: var(--color-grey-400);
  font-size: 1.4rem;
`;

function ProposalItem({ name }) {
  return (
    <ProposalItemContainer>
      <ProposalInfo>
        <ProposalName>{name}</ProposalName>
        <CreatedAt>Created: 05-01-2025</CreatedAt>
      </ProposalInfo>
    </ProposalItemContainer>
  );
}

export default ProposalItem;
