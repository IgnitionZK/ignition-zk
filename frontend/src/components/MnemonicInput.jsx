import React, { useState } from "react";
import styled from "styled-components";
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

const ContextInfo = styled.div`
  background: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  margin-bottom: 2.4rem;
  width: 100%;
`;

const ContextTitle = styled.h3`
  color: #fff;
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 0.8rem;
`;

const ContextSubtitle = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
`;

const ContextDescription = styled.p`
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
 * A generic modal component for entering mnemonic phrases.
 * Can be customized for different use cases like proposal submission or inbox unlocking.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Modal title
 * @param {string} props.subtitle - Modal subtitle
 * @param {number} props.wordCount - Number of words in the mnemonic phrase
 * @param {Object} props.contextInfo - Context information to display (title, groupName, description)
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {Function} props.onSubmit - Function to call when mnemonic is submitted
 * @param {string} props.confirmButtonText - Text for confirm button
 * @param {string} props.cancelButtonText - Text for cancel button
 * @param {string} props.confirmationMessage - Message for confirmation modal
 * @param {boolean} props.showConfirmation - Whether to show confirmation modal
 * @param {string} props.confirmButtonColor - Color for confirm button
 * @param {string} props.confirmButtonHoverColor - Hover color for confirm button
 * @param {string} props.cancelButtonColor - Color for cancel button
 * @param {string} props.cancelButtonHoverColor - Hover color for cancel button
 * @param {Object} props.proposal - Legacy prop for backward compatibility
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
  // Legacy props for backward compatibility
  proposal = null,
}) {
  const [words, setWords] = useState(Array(wordCount).fill(""));
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handle legacy proposal prop for backward compatibility
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

  // Check if all words are filled
  const areAllWordsFilled = words.every((word) => word.trim() !== "");

  // Split words into two columns
  const firstColumn = words.slice(0, Math.ceil(wordCount / 2));
  const secondColumn = words.slice(Math.ceil(wordCount / 2), wordCount);

  const renderContextInfo = () => {
    if (!finalContextInfo) return null;

    return (
      <ContextInfo>
        {finalContextInfo.title && (
          <ContextTitle>{finalContextInfo.title}</ContextTitle>
        )}
        {finalContextInfo.groupName && (
          <ContextSubtitle>{finalContextInfo.groupName}</ContextSubtitle>
        )}
        {finalContextInfo.description && (
          <ContextDescription>
            {finalContextInfo.description}
          </ContextDescription>
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
