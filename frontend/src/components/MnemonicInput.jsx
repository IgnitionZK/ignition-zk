// React and libraries
import React, { useState, useEffect } from "react";
import styled from "styled-components";

// Components
import CustomButton from "./CustomButton";
import ConfirmationModal from "./ConfirmationModal";

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
  background: var(--color-grey-800);
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
  color: #ffffff;
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

const ContextInfo = styled.div`
  background: var(--color-grey-700);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid var(--color-grey-600);
  margin-bottom: 2.4rem;
  width: 100%;
`;

const ContextTitle = styled.h3`
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 0.8rem;
`;

const ContextSubtitle = styled.p`
  color: #ffffff;
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
`;

const ContextDescription = styled.p`
  color: #ffffff;
  font-size: 1.4rem;
  line-height: 1.4;
`;

const WarningText = styled.p`
  color: var(--color-red-400);
  font-size: 1.3rem;
  font-weight: 500;
  margin-top: 1.2rem;
  text-align: center;
  line-height: 1.4;
`;

const MnemonicGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 32px;
  background: var(--color-grey-700);
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
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  min-width: 22px;
  text-align: right;
`;

const Input = styled.input`
  background: var(--color-grey-800);
  border: 1px solid var(--color-grey-500);
  border-radius: 6px;
  color: #ffffff;
  padding: 8px 12px;
  font-size: 1.1rem;
  width: 100%;
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: #ffffff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }
`;

/**
 * A modal component for entering mnemonic phrases with customizable context and confirmation.
 * Supports pre-populated mnemonics, voting contexts, and backward compatibility with legacy props.
 */
function MnemonicInput({
  // Generic props
  title = "Enter Mnemonic Phrase",
  subtitle = "Please enter your mnemonic phrase",
  wordCount = 12,
  contextInfo = null,
  onClose,
  onSubmit,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  confirmationMessage = "Are you sure you want to proceed?",
  showConfirmation = true,
  confirmButtonColor = "#a5b4fc",
  confirmButtonHoverColor = "#818cf8",
  cancelButtonColor = "#f87171",
  cancelButtonHoverColor = "#ef4444",
  prePopulatedMnemonic = null,
  selectedVote = null,
  // Legacy props for backward compatibility
  proposal = null,
}) {
  const initializeWords = () => {
    if (prePopulatedMnemonic) {
      const mnemonicWords = prePopulatedMnemonic.split(" ");
      const wordsArray = Array(wordCount).fill("");
      mnemonicWords.forEach((word, index) => {
        if (index < wordCount) {
          wordsArray[index] = word;
        }
      });
      return wordsArray;
    }
    return Array(wordCount).fill("");
  };

  const [words, setWords] = useState(initializeWords);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (prePopulatedMnemonic) {
      const mnemonicWords = prePopulatedMnemonic.split(" ");
      const wordsArray = Array(wordCount).fill("");
      mnemonicWords.forEach((word, index) => {
        if (index < wordCount) {
          wordsArray[index] = word;
        }
      });
      setWords(wordsArray);
    }
  }, [prePopulatedMnemonic, wordCount]);

  const finalContextInfo =
    contextInfo ||
    (proposal
      ? {
          title: proposal.title,
          groupName: proposal.group_name,
          description: proposal.description,
        }
      : null);

  const handleWordChange = (index, value) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleSubmit = () => {
    if (showConfirmation) {
      setShowConfirmModal(true);
    } else {
      const mnemonic = words.map((word) => word.trim()).join(" ");
      onSubmit(mnemonic);
    }
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    const mnemonic = words.map((word) => word.trim()).join(" ");
    onSubmit(mnemonic);
  };

  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
  };

  const areAllWordsFilled = words.every((word) => word.trim() !== "");

  const firstColumn = words.slice(0, Math.ceil(wordCount / 2));
  const secondColumn = words.slice(Math.ceil(wordCount / 2), wordCount);

  const renderContextInfo = () => {
    if (!finalContextInfo) return null;

    const isVotingContext = !!selectedVote;

    return (
      <ContextInfo>
        {finalContextInfo.title && (
          <ContextTitle>{finalContextInfo.title}</ContextTitle>
        )}
        {!isVotingContext && finalContextInfo.groupName && (
          <ContextSubtitle>{finalContextInfo.groupName}</ContextSubtitle>
        )}
        {!isVotingContext && finalContextInfo.description && (
          <ContextDescription>
            {finalContextInfo.description}
          </ContextDescription>
        )}
        {selectedVote && (
          <ContextDescription
            style={{
              fontSize: "1.6rem",
              fontWeight: "500",
              textAlign: "center",
              marginTop: "1.2rem",
            }}
          >
            <strong>Selected Vote:</strong>{" "}
            {selectedVote.charAt(0).toUpperCase() + selectedVote.slice(1)}
          </ContextDescription>
        )}
        {isVotingContext && (
          <WarningText>
            ⚠️ Warning: Once submitted, this action cannot be undone.
          </WarningText>
        )}
      </ContextInfo>
    );
  };

  return (
    <>
      <Overlay>
        <Modal>
          <Title>{title}</Title>
          <Subtitle>{subtitle}</Subtitle>

          {renderContextInfo()}

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
                <WordInput key={index + firstColumn.length}>
                  <WordIndex>{index + firstColumn.length + 1}</WordIndex>
                  <Input
                    type="text"
                    value={word}
                    onChange={(e) =>
                      handleWordChange(
                        index + firstColumn.length,
                        e.target.value
                      )
                    }
                    placeholder={`Word ${index + firstColumn.length + 1}`}
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
              backgroundColor={confirmButtonColor}
              hoverColor={confirmButtonHoverColor}
              textColor="#232328"
              size="large"
              onClick={handleSubmit}
              style={{ minWidth: 120 }}
              disabled={!areAllWordsFilled}
            >
              {confirmButtonText}
            </CustomButton>
            <CustomButton
              backgroundColor={cancelButtonColor}
              hoverColor={cancelButtonHoverColor}
              textColor="#fff"
              size="large"
              onClick={onClose}
              style={{ minWidth: 120 }}
            >
              {cancelButtonText}
            </CustomButton>
          </div>
        </Modal>
      </Overlay>

      {showConfirmation && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          title="Confirm Action"
          message={confirmationMessage}
          confirmText="Confirm"
          cancelText="Cancel"
          confirmButtonColor={confirmButtonColor}
          confirmButtonHoverColor={confirmButtonHoverColor}
          cancelButtonColor="var(--color-grey-600)"
          cancelButtonHoverColor="var(--color-grey-500)"
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancelSubmit}
        />
      )}
    </>
  );
}

export default MnemonicInput;
