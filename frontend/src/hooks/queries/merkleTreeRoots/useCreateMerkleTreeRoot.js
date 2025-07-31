import { useQueryClient } from "@tanstack/react-query";
import { MerkleTreeService } from "../../../scripts/merkleTreeService";
import { useInsertMerkleTreeRoot } from "./useInsertMerkleTreeRoot";
import { useGetLeavesByGroupId } from "../merkleTreeLeaves/useGetLeavesByGroupId";
import { useRelayerUpdateRoot } from "../../relayers/useRelayerUpdateRoot";
import { uuidToBytes32 } from "../../../utils/uuidToBytes32";

/**
 * Custom hook for creating a new Merkle tree root using blockchain-first approach
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group
 * @param {BigInt} params.newCommitment - The new commitment to add
 * @returns {Object} Object containing the createMerkleTreeRoot function and loading states
 */
export const useCreateMerkleTreeRoot = ({ groupId } = {}) => {
  const queryClient = useQueryClient();
  const { insertNewMerkleTreeRoot, isLoading: isLoadingInsertRoot } =
    useInsertMerkleTreeRoot();
  const { groupCommitments, isLoading: isLoadingCommitments } =
    useGetLeavesByGroupId({ groupId });
  const { updateMerkleRoot, isLoading: isLoadingUpdateMerkleRoot } =
    useRelayerUpdateRoot();

  /**
   * Calculates a new Merkle tree root without inserting it into the database
   * This is used for blockchain updates first, then database insertion follows
   */
  const calculateMerkleTreeRoot = async ({ newCommitment }) => {
    // Create array of all commitment values
    const allCommitments = [
      ...(groupCommitments || []).map((commitment) =>
        BigInt(commitment.commitment_value)
      ),
      newCommitment,
    ];

    // Create new merkle tree with all commitments
    const { root } = await MerkleTreeService.createMerkleTree(allCommitments);
    const memberCount = allCommitments.length;

    const currentTreeVersion = queryClient.getQueryData([
      "currentMerkleTreeRootVersion",
    ]);

    // Calculate the tree version
    const treeVersion = currentTreeVersion ? currentTreeVersion + 1 : 1;
    console.log(
      `[FRONTEND/useCreateMerkleTreeRoot] Current Tree Version: ${currentTreeVersion}, New Tree Version: ${treeVersion}`
    );

    return { root, treeVersion, memberCount };
  };

  /**
   * Inserts the calculated Merkle tree root into the database
   * This should be called after successful blockchain update
   */
  const insertMerkleTreeRoot = async ({ groupId, rootHash, treeVersion }) => {
    await insertNewMerkleTreeRoot({
      groupId,
      rootHash,
      treeVersion,
    });
  };

  /**
   * Complete flow: Calculate root, update blockchain, then insert into database
   */
  const createMerkleTreeRoot = async ({
    newCommitment,
    onBlockchainSuccess,
    onDatabaseSuccess,
    onError,
  }) => {
    try {
      // Step 1: Calculate new Merkle tree root (local computation)
      const { root, treeVersion, memberCount } = await calculateMerkleTreeRoot({
        newCommitment,
      });

      // Convert the groupId UUID to bytes32 format
      const groupKeyBytes32 = uuidToBytes32(groupId);
      console.log("[FRONTEND/useCreateMerkleTreeRoot] Group Key Bytes32:", groupKeyBytes32);
      console.log("[FRONTEND/useCreateMerkleTreeRoot] Member Count:", memberCount);
      console.log("[FRONTEND/useCreateMerkleTreeRoot] Tree Version:", treeVersion);

      // Step 2: Update Merkle tree root on blockchain via relayer
      await updateMerkleRoot({
        treeVersion,
        rootValue: root,
        groupKey: groupKeyBytes32,
        memberCount
      });

      if (onBlockchainSuccess) {
        onBlockchainSuccess({ root, treeVersion, memberCount });
      }

      // Step 3: Insert the new Merkle tree root into database
      await insertMerkleTreeRoot({
        groupId,
        rootHash: root,
        treeVersion,
      });

      if (onDatabaseSuccess) {
        onDatabaseSuccess({ root, treeVersion });
      }

      return { root, treeVersion };
    } catch (error) {
      console.error("Merkle tree root creation failed:", error);

      // Provide more context about where the failure occurred
      let enhancedError = error;

      if (error.message.includes("Edge function error")) {
        // This is a blockchain transaction failure
        enhancedError = new Error(
          `Blockchain transaction failed: ${error.message}`
        );
      } else if (error.message.includes("Failed to insert")) {
        // This is a database insertion failure
        enhancedError = new Error(
          `Database insertion failed: ${error.message}`
        );
      }

      if (onError) {
        onError(enhancedError);
      }
      throw enhancedError;
    }
  };

  return {
    calculateMerkleTreeRoot,
    insertMerkleTreeRoot,
    createMerkleTreeRoot,
    isLoading:
      isLoadingInsertRoot || isLoadingCommitments || isLoadingUpdateMerkleRoot,
  };
};
