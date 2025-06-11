import React, { useState } from "react";
import styled from "styled-components";
import CustomButton from "./CustomButton";

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
  background: #232328;
  border-radius: 12px;
  padding: 32px 24px 24px 24px;
  min-width: 340px;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled.h2`
  color: #a5b4fc;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
`;

const Subtitle = styled.p`
  color: #fff;
  font-size: 1.2rem;
  margin-bottom: 8px;
  text-align: center;
`;

const ProposalInfo = styled.div`
  background: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  margin-bottom: 2.4rem;
  width: 100%;
`;

const ProposalTitle = styled.h3`
  color: #fff;
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 0.8rem;
`;

const GroupName = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
`;

const ProposalDescription = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  line-height: 1.4;
`;

const MnemonicGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 32px;
  background: #44444a;
  border-radius: 10px;
  padding: 24px 16px;
  margin-bottom: 28px;
  width: 100%;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const WordInput = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15rem;
  color: #fff;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const WordIndex = styled.span`
  color: #a5b4fc;
  font-size: 1.1rem;
  font-weight: 700;
  min-width: 22px;
  text-align: right;
`;

const Input = styled.input`
  background: #232328;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 6px;
  color: #fff;
  padding: 8px 12px;
  font-size: 1.1rem;
  width: 100%;
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: #a5b4fc;
    box-shadow: 0 0 0 2px rgba(165, 180, 252, 0.2);
  }
`;

/**
 * A modal component that displays a form for entering a 12-word mnemonic phrase.
 * Used for submitting mnemonic phrases for proposals.
 */
function MnemonicInput({ proposal, onClose, onSubmit }) {
  const [words, setWords] = useState(Array(12).fill(""));

  const handleWordChange = (index, value) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleSubmit = () => {
    const mnemonic = words.map((word) => word.trim()).join(" ");
    onSubmit(mnemonic);
  };

  // Check if all words are filled
  const areAllWordsFilled = words.every((word) => word.trim() !== "");

  // Split words into two columns
  const firstColumn = words.slice(0, 6);
  const secondColumn = words.slice(6, 12);

  return (
    <Overlay>
      <Modal>
        <Title>Enter Mnemonic Phrase</Title>
        <Subtitle>Please enter your 12-word mnemonic phrase</Subtitle>

        <ProposalInfo>
          <ProposalTitle>{proposal.title}</ProposalTitle>
          <GroupName>{proposal.group_name}</GroupName>
          <ProposalDescription>{proposal.description}</ProposalDescription>
        </ProposalInfo>

        <MnemonicGrid>
          <Column>
            {firstColumn.map((word, index) => (
              <WordInput key={index}>
                <WordIndex>{index + 1}</WordIndex>
                <Input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  placeholder={`Word ${index + 1}`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </WordInput>
            ))}
          </Column>
          <Column>
            {secondColumn.map((word, index) => (
              <WordInput key={index + 6}>
                <WordIndex>{index + 7}</WordIndex>
                <Input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(index + 6, e.target.value)}
                  placeholder={`Word ${index + 7}`}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </WordInput>
            ))}
          </Column>
        </MnemonicGrid>

        <div style={{ display: "flex", gap: "1.2rem" }}>
          <CustomButton
            backgroundColor="#a5b4fc"
            hoverColor="#818cf8"
            textColor="#232328"
            size="large"
            onClick={handleSubmit}
            style={{ minWidth: 120 }}
            disabled={!areAllWordsFilled}
          >
            Confirm
          </CustomButton>
          <CustomButton
            backgroundColor="#f87171"
            hoverColor="#ef4444"
            textColor="#fff"
            size="large"
            onClick={onClose}
            style={{ minWidth: 120 }}
          >
            Cancel
          </CustomButton>
        </div>
      </Modal>
    </Overlay>
  );
}

export default MnemonicInput;
