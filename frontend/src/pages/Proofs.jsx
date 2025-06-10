import React, { useState } from "react";
import styled from "styled-components";

// icon
import { MdAddCircle } from "react-icons/md";

// components
import PageHeader from "../components/PageHeader";
import CustomButtonIcon from "../components/CustomButtonIcon";
import ProposalItem from "../components/ProposalItem";

const PageContainer = styled.div`
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

const IconContainer = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-right: 8px;
`;

// Modal styles (adapted from MnemonicDisplay)
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #3a4353;
  border-radius: 12px;
  padding: 32px 24px 24px 24px;
  min-width: 340px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;

const ModalTitle = styled.h2`
  color: #fff;
  font-size: 2.6rem;
  font-weight: 700;
  margin-bottom: 24px;
  text-align: center;
  text-decoration: underline;
  letter-spacing: 0.5px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: #ffb3b3;
  font-size: 2rem;
  cursor: pointer;
`;

const ItemList = styled.ul`
  list-style: none;
  width: 100%;
  padding: 0;
  margin: 0 0 32px 0;
  max-height: 250px;
  overflow-y: auto;
`;

const Item = styled.li`
  background: ${({ selected }) => (selected ? "#444b5e" : "transparent")};
  color: #fff;
  font-size: 2rem;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.2s;
  &:hover {
    background: ${({ disabled }) => (disabled ? "inherit" : "#444b5e")};
  }
`;

const SelectButton = styled.button`
  width: 200px;
  padding: 12px 0;
  border-radius: 12px;
  background: #7b88b6;
  color: #232328;
  font-size: 1.4rem;
  font-weight: 600;
  border: none;
  margin-top: 32px;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

export default function Proofs() {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const items = [
    "Proposal1",
    "Proposal2",
    "Proposal3",
    "Proposal4",
    "Proposal5",
    "Proposal6",
  ];
  console.log(selected);

  return (
    <PageContainer>
      <PageHeader title="" />
      <Section>
        <ProofHeader>
          <SectionTitle> Pending </SectionTitle>
          <CustomButtonIcon
            icon={MdAddCircle}
            tooltipText="Create new proof"
            iconProps={{ size: 36 }}
            hoverColor="#818cf8"
            onClick={() => setShowModal(true)}
          />
        </ProofHeader>
        <ProposalItem name={"Proposal1 - Vote"} />
        <ProposalItem name={"Proposal2 - Vote"} />
        <ProposalItem name={"Proposal3 - Vote"} />
        <ProposalItem name={"Proposal4 - Vote"} />
      </Section>
      <Section>
        <SectionTitle>Activity History</SectionTitle>
      </Section>
      {showModal && (
        <Overlay onClick={() => setShowModal(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Select Proposal</ModalTitle>
            <CloseButton onClick={() => setShowModal(false)}>×</CloseButton>
            <ItemList>
              {items.map((item, idx) => (
                <Item
                  key={item}
                  selected={selected === idx}
                  onClick={() => setSelected(idx)}
                >
                  {item}
                </Item>
              ))}
            </ItemList>
            <SelectButton disabled={selected === null}>Select</SelectButton>
          </Modal>
        </Overlay>
      )}
    </PageContainer>
  );
}
