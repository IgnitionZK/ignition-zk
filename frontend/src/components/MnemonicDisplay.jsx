// Libraries
import styled from "styled-components";

// Components
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

const Warning = styled.p`
  color: #ef4444;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 18px;
  text-align: center;
`;

const MnemonicGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: 16px 32px;
  background: #44444a;
  border-radius: 10px;
  padding: 24px 16px;
  margin-bottom: 28px;
  width: 100%;
`;

const WordBox = styled.div`
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

const Note = styled.p`
  color: #b3b3b3;
  font-size: 1.1rem;
  text-align: center;
  margin-top: 18px;
`;

function getGridColumns(wordCount) {
  if (wordCount <= 12) return 3;
  if (wordCount <= 18) return 4;
  if (wordCount <= 24) return 4;
  return 5;
}

/**
 * A modal component that displays a mnemonic phrase in a grid layout with numbered words.
 * Used for securely showing users their recovery phrase during wallet creation.
 */
function MnemonicDisplay({ mnemonic, onClose }) {
  const words = mnemonic.trim().split(/\s+/);
  const columns = getGridColumns(words.length);
  const rows = Math.ceil(words.length / columns);

  const grid = Array.from({ length: rows }, (_, rowIdx) =>
    Array.from({ length: columns }, (_, colIdx) => {
      const wordIdx = colIdx * rows + rowIdx;
      return wordIdx < words.length
        ? { word: words[wordIdx], idx: wordIdx }
        : null;
    })
  );

  return (
    <Overlay>
      <Modal>
        <Title>Step 2: Record Mnemonic Phrase</Title>
        <Subtitle>
          Securely record the following mnemonic phrase and keep it in a safe
          physical location.
          <br />
          <b>Do NOT take a screenshot.</b>
        </Subtitle>
        <MnemonicGrid $columns={columns}>
          {grid.flat().map((cell, i) =>
            cell ? (
              <WordBox key={cell.idx}>
                <WordIndex>{cell.idx + 1}</WordIndex> {cell.word}
              </WordBox>
            ) : (
              <div key={"empty-" + i} />
            )
          )}
        </MnemonicGrid>
        <CustomButton
          backgroundColor="#ef4444"
          hoverColor="#dc2626"
          textColor="#fff"
          size="large"
          onClick={onClose}
          style={{ marginBottom: 8, minWidth: 120 }}
        >
          Close
        </CustomButton>
        <Note>
          <i>
            Once you close this window you will not be able to see your mnemonic
            phrase again.
          </i>
        </Note>
      </Modal>
    </Overlay>
  );
}

export default MnemonicDisplay;
