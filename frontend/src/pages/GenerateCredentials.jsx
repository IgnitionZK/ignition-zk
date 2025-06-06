/**
 * @fileoverview A React component for generating and managing user credentials including mnemonic phrases
 * and Merkle tree commitments for anonymous voting and membership.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";

//components
import MnemonicDisplay from "../components/MnemonicDisplay";
import CustomButton from "../components/CustomButton";
// scrips
import { ZkCredential } from "../scripts/generateCredentials-browser-safe";
import { MerkleTreeService } from "../scripts/generateRoot";
// queries
import { useInsertLeaf } from "../hooks/queries/merkleTreeLeaves/useInsertLeaf";
import { useGetGroupMemberId } from "../hooks/queries/groupMembers/useGetGroupMemberId";
import { useGetLeavesByGroupId } from "../hooks/queries/merkleTreeLeaves/useGetLeavesByGroupId";
import { useInsertMerkleTreeRoot } from "../hooks/queries/merkleTreeRoots/useInsertMerkleTreeRoot";

const Container = styled.div`
  min-height: 100vh;
  background: #232328;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
`;

const Title = styled.h1`
  color: #a5b4fc;
  font-size: 2.8rem;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
`;

const Description = styled.p`
  color: #fff;
  font-size: 1.6rem;
  max-width: 700px;
  text-align: center;
  margin-bottom: 40px;
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
  margin: 0 auto 40px auto;
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
  margin: 40px 0 16px 0;
`;

const Note = styled.p`
  color: #b3b3b3;
  font-size: 1.2rem;
  text-align: center;
  margin-top: 16px;
`;

/**
 * GenerateCredentials Component
 *
 * A component that handles the generation of user credentials including:
 * - 12-word mnemonic phrase for account recovery
 * - Commitment insertion into Merkle tree
 * - Merkle tree root generation and updates
 */
function GenerateCredentials() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [credentials, setCredentials] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const groupId = queryClient.getQueryData(["currentGroupId"]);
  const currentTreeVersion = queryClient.getQueryData([
    "currentMerkleTreeRootVersion",
  ]);

  const { insertLeaf, isLoading: isLoadingInsertLeaf } = useInsertLeaf();
  const { isLoading, groupMemberId } = useGetGroupMemberId({ groupId });
  const {
    mutate: insertNewMerkleTreeRoot,
    isLoading: isLoadingInsertMerkleTreeRoot,
    error: errorIsnertMerkleTreeRoot,
  } = useInsertMerkleTreeRoot();

  const {
    isLoading: groupCommitmentsLoading,
    groupCommitments,
    error,
  } = useGetLeavesByGroupId();

  /**
   * Generates new credentials and updates the Merkle tree
   *
   * This function:
   * 1. Generates a new 12-word mnemonic and commitment
   * 2. Inserts the commitment into the Merkle tree
   * 3. Generates a new Merkle tree root
   * 4. Updates the Merkle tree root in the database
   */
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await ZkCredential.generateCredentials(128);
      setCredentials(result);

      // Insert the commitment into the merkle tree
      if (!groupMemberId) {
        console.error("No group member ID available");
        throw new Error("Group member ID is required to insert commitment");
      }

      try {
        await insertLeaf({
          groupMemberId: groupMemberId,
          commitment: result.commitment.toString(),
          groupId: groupId,
        });

        // Create array of all commitment values
        const allCommitments = [
          ...(groupCommitments || []).map((commitment) =>
            BigInt(commitment.commitment_value)
          ),
          result.commitment,
        ];

        // Create new merkle tree with all commitments
        const { root } = await MerkleTreeService.createMerkleTree(
          allCommitments
        );

        // Insert the new Merkle tree root
        await insertNewMerkleTreeRoot({
          groupId: groupId,
          rootHash: root,
          treeVersion: currentTreeVersion ? currentTreeVersion + 1 : 1,
        });
      } catch (error) {
        console.error("Failed to insert leaf:", error);
        throw new Error("Failed to insert commitment into merkle tree");
      }
    } catch (error) {
      console.error("Error generating credentials:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handles the closing of the mnemonic display and navigation
   *
   * Clears the credentials state and navigates to the dashboard
   */
  const handleCloseMnemonic = () => {
    setCredentials(null);
    navigate("/dashboard");
  };

  return (
    <>
      {credentials && credentials.mnemonic ? (
        <MnemonicDisplay
          mnemonic={credentials.mnemonic}
          onClose={handleCloseMnemonic}
        />
      ) : (
        <Container>
          <Title>Step 1: Generate Your Credentials</Title>
          <Description>
            The unique 12-word mnemonic is the master key to your secret
            identity. It allows you to restore access to your account and is
            used for generating anonymous proposals, voting, and membership.
          </Description>
          <Attention>Attention</Attention>
          <AttentionBox>
            <ul>
              <li>
                Click "Generate" to create your secret 12-word mnemonic phrase.
              </li>
              <li>
                This phrase is your private key and your proof of identity.
              </li>
              <li>
                <b>NEVER</b> share this phrase with anyone. If someone has it,
                they will have full control over your account.
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
              <li>If you lose this phrase, your access cannot be recovered.</li>
            </ul>
          </AttentionBox>
          <ButtonWrapper>
            <CustomButton
              backgroundColor="#A5B4FC"
              hoverColor="#818cf8"
              textColor="#232328"
              size="large"
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                isLoading ||
                isLoadingInsertLeaf ||
                isLoadingInsertMerkleTreeRoot ||
                !groupMemberId
              }
            >
              {isGenerating
                ? "Generating..."
                : isLoadingInsertLeaf
                ? "Inserting Commitment..."
                : isLoadingInsertMerkleTreeRoot
                ? "Updating Merkle Tree..."
                : isLoading
                ? "Loading..."
                : "Generate"}
            </CustomButton>
          </ButtonWrapper>
          <Note>
            <i>
              {!groupMemberId && !isLoading
                ? "Please wait while we prepare your credentials..."
                : "Upon clicking 'Generate', your 24-word mnemonic will be displayed for you to securely record."}
            </i>
          </Note>
        </Container>
      )}
    </>
  );
}

export default GenerateCredentials;
