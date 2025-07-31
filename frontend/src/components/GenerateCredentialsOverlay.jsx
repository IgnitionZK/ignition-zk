import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-hot-toast";

//components
import MnemonicDisplay from "./MnemonicDisplay";
import CustomButton from "./CustomButton";
import ConfirmationModal from "./ConfirmationModal";
import Spinner from "./Spinner";
// scripts
import { ZkCredential } from "../scripts/generateCredentials-browser-safe";
// hooks
import { useGetGroupMemberId } from "../hooks/queries/groupMembers/useGetGroupMemberId";
import { useAtomicCommitmentInsertion } from "../hooks/queries/merkleTreeRoots/useAtomicCommitmentInsertion";

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
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
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

const Description = styled.p`
  color: #fff;
  font-size: 1.6rem;
  max-width: 600px;
  text-align: center;
  margin-bottom: 24px;
`;

const Attention = styled.div`
  background: none;
  color: #ef4444;
  font-size: 2.4rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-align: center;
`;

const AttentionBox = styled.div`
  background: none;
  color: #fff;
  font-size: 1.3rem;
  max-width: 600px;
  margin: 0 auto 24px auto;
  text-align: left;
  padding: 0;
  ul {
    margin: 0;
    padding-left: 28px;
    list-style: disc;
  }
  li {
    margin-bottom: 10px;
  }
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.2rem;
  margin: 24px 0 16px 0;
`;

const Note = styled.p`
  color: #b3b3b3;
  font-size: 1.2rem;
  text-align: center;
  margin-top: 16px;
`;

const GroupInfo = styled.div`
  background: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  margin-bottom: 2.4rem;
  width: 100%;
`;

const GroupName = styled.h3`
  color: #fff;
  font-size: 1.8rem;
  font-weight: 500;
  margin-bottom: 0.8rem;
`;

const ContractAddress = styled.p`
  color: var(--color-grey-300);
  font-size: 1.4rem;
  font-family: monospace;
`;

// Loading Overlay Styles
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const LoadingText = styled.p`
  color: #fff;
  font-size: 1.8rem;
  margin-top: 16px;
  text-align: center;
`;

/**
 * A modal component that handles the generation of user credentials including:
 * - 12-word mnemonic phrase for account recovery
 * - Commitment insertion into Merkle tree
 * - Merkle tree root generation and updates
 * - Blockchain root update via relayer
 */
function GenerateCredentialsOverlay({ group, onClose }) {
  const [credentials, setCredentials] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] =
    useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  const groupId = group?.group_id;

  const { isLoading, groupMemberId } = useGetGroupMemberId({ groupId });
  const { insertCommitment, isLoading: isInsertingCommitment } =
    useAtomicCommitmentInsertion();

  /**
   * Shows the generate confirmation modal
   */
  const handleGenerateClick = () => {
    setShowGenerateConfirmModal(true);
  };

  /**
   * Generates new credentials using the atomic commitment insertion
   */
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      console.log("Starting credential generation...");

      // Step 1: Generate credentials (local computation)
      const result = await ZkCredential.generateCredentials(128);
      console.log("Generated credentials:", result);

      if (!groupMemberId) {
        throw new Error("Group member ID is required to generate credentials");
      }

      console.log("Group Member ID:", groupMemberId);
      console.log("Group ID:", groupId);

      // Step 2: Use the atomic commitment insertion
      const dbResult = await insertCommitment({
        groupId,
        groupMemberId,
        commitment: result.commitment,
        onBlockchainSuccess: ({ root, treeVersion }) => {
          console.log(
            `Blockchain transaction confirmed. Root: ${root}, Version: ${treeVersion}`
          );
          toast.success(
            "Credentials generated and blockchain updated successfully!"
          );
        },
        onError: (error) => {
          console.error("Commitment insertion failed:", error);
          throw error;
        },
      });

      console.log("Atomic commitment insertion completed:", dbResult);

      // Step 3: Set credentials for display
      setCredentials(result);
    } catch (error) {
      console.error("Error generating credentials:", error);
      setCredentials(null);

      // Provide specific error messages based on the error type
      let errorMessage = "Failed to generate credentials. Please try again.";

      if (
        error.message.includes("System is busy") ||
        error.message.includes("lock timeout") ||
        error.message.includes("please try again in a moment")
      ) {
        errorMessage = "System is busy. Please try again in a moment.";
      } else if (error.message.includes("Group member ID is required")) {
        errorMessage =
          "Group membership error. Please refresh the page and try again.";
      } else if (error.message.includes("Commitment insertion failed")) {
        errorMessage = "Database error. Please try again.";
      }

      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handles the closing of the mnemonic display
   *
   * Clears the credentials state and calls the onClose callback with success flag
   */
  const handleCloseMnemonic = () => {
    setCredentials(null);
    onClose(true);
  };

  /**
   * Shows the cancel confirmation modal
   */
  const handleCancelClick = () => {
    setShowCancelConfirmModal(true);
  };

  /**
   * Handles the actual generation after confirmation
   */
  const handleConfirmGenerate = async () => {
    setShowGenerateConfirmModal(false);
    await handleGenerate();
  };

  /**
   * Handles the actual cancellation after confirmation
   */
  const handleConfirmCancel = () => {
    setShowCancelConfirmModal(false);
    onClose(false);
  };

  return (
    <>
      <Overlay>
        <Modal>
          {credentials && credentials.mnemonic ? (
            <MnemonicDisplay
              mnemonic={credentials.mnemonic}
              onClose={handleCloseMnemonic}
            />
          ) : (
            <>
              <Title>Step 1: Generate Your Credentials</Title>
              <Description>
                The unique 12-word mnemonic is the master key to your secret
                identity. It allows you to restore access to your account and is
                used for generating anonymous proposals, voting, and membership.
              </Description>

              <GroupInfo>
                <GroupName>{group?.name}</GroupName>
                <ContractAddress>
                  {group?.erc721_contract_address}
                </ContractAddress>
              </GroupInfo>

              <Attention>Attention</Attention>
              <AttentionBox>
                <ul>
                  <li>
                    Click "Generate" to create your secret 12-word mnemonic
                    phrase.
                  </li>
                  <li>
                    This phrase is your private key and your proof of identity.
                  </li>
                  <li>
                    <b>NEVER</b> share this phrase with anyone. If someone has
                    it, they will have full control over your account.
                  </li>
                  <li>
                    Do <b>NOT</b> store it digitally: Avoid screenshots, email,
                    cloud services (like Google Drive, Dropbox, iCloud), or text
                    messages.
                  </li>
                  <li>
                    Write it down immediately and keep it in a safe, physical
                    location.
                  </li>
                  <li>
                    If you lose this phrase, your access cannot be recovered.
                  </li>
                </ul>
              </AttentionBox>

              <ButtonWrapper>
                <CustomButton
                  backgroundColor="#A5B4FC"
                  hoverColor="#818cf8"
                  textColor="#232328"
                  size="large"
                  onClick={handleGenerateClick}
                  disabled={
                    isGenerating ||
                    isLoading ||
                    isInsertingCommitment ||
                    !groupMemberId
                  }
                >
                  Generate
                </CustomButton>
                <CustomButton
                  backgroundColor="#f87171"
                  hoverColor="#ef4444"
                  textColor="#fff"
                  size="large"
                  onClick={handleCancelClick}
                  style={{ minWidth: 120 }}
                >
                  Cancel
                </CustomButton>
              </ButtonWrapper>

              <Note>
                <i>
                  {!groupMemberId && !isLoading
                    ? "Please wait while we prepare your credentials..."
                    : "Upon clicking 'Generate', your 12-word mnemonic will be displayed for you to securely record."}
                </i>
              </Note>
            </>
          )}
        </Modal>
      </Overlay>

      {/* Loading Overlay */}
      {isGenerating && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>Generating credentials...</LoadingText>
          <LoadingText
            style={{
              fontSize: "1.4rem",
              marginTop: "0.8rem",
              color: "var(--color-grey-300)",
            }}
          >
            This may take several minutes.
          </LoadingText>
        </LoadingOverlay>
      )}

      {/* Confirmation Modal for Generate */}
      <ConfirmationModal
        isOpen={showGenerateConfirmModal}
        title="Generate Credentials"
        message="Are you sure you want to generate your credentials? This will create a new 12-word mnemonic phrase that you must securely store. This action cannot be undone."
        confirmText="Generate"
        cancelText="Cancel"
        confirmButtonColor="#a5b4fc"
        confirmButtonHoverColor="#818cf8"
        cancelButtonColor="var(--color-grey-600)"
        cancelButtonHoverColor="var(--color-grey-500)"
        onConfirm={handleConfirmGenerate}
        onCancel={() => setShowGenerateConfirmModal(false)}
      />

      {/* Confirmation Modal for Cancel */}
      <ConfirmationModal
        isOpen={showCancelConfirmModal}
        title="Cancel Credential Generation"
        message="Are you sure you want to cancel? You will need to generate credentials later to participate in group activities."
        confirmText="Cancel Generation"
        cancelText="Continue"
        confirmButtonColor="#f87171"
        confirmButtonHoverColor="#ef4444"
        cancelButtonColor="var(--color-grey-600)"
        cancelButtonHoverColor="var(--color-grey-500)"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirmModal(false)}
      />
    </>
  );
}

export default GenerateCredentialsOverlay;
