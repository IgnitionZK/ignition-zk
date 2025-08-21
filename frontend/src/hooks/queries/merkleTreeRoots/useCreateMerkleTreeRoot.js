import { useQueryClient } from "@tanstack/react-query";
import { MerkleTreeService } from "../../../scripts/merkleTreeService";
import { useInsertMerkleTreeRoot } from "./useInsertMerkleTreeRoot";
import { useGetLeavesByGroupId } from "../merkleTreeLeaves/useGetLeavesByGroupId";
import { useRelayerUpdateRoot } from "../../relayers/useRelayerUpdateRoot";
import { uuidToBytes32 } from "../../../scripts/utils/uuidToBytes32";

/**
 * Custom hook for creating a new Merkle tree root using blockchain-first approach.
 * This hook handles the complete flow of calculating a new Merkle tree root,
 * updating it on the blockchain via a relayer, and then inserting it into the database.
 * It follows a blockchain-first pattern where blockchain updates happen before database operations.
 */
export const useCreateMerkleTreeRoot = ({ groupId } = {}) => {
  const queryClient = useQueryClient();
  const { insertNewMerkleTreeRoot, isLoading: isLoadingInsertRoot } =
    useInsertMerkleTreeRoot();
  const { groupCommitments, isLoading: isLoadingCommitments } =
    useGetLeavesByGroupId({ groupId });
  const { updateMerkleRoot, isLoading: isLoadingUpdateMerkleRoot } =
    useRelayerUpdateRoot();

  const calculateMerkleTreeRoot = async ({ newCommitment }) => {
    const allCommitments = [
      ...(groupCommitments || []).map((commitment) =>
        BigInt(commitment.commitment_value)
      ),
      newCommitment,
    ];

    const { root } = await MerkleTreeService.createMerkleTree(allCommitments);
    const memberCount = allCommitments.length;

    const currentTreeVersion = queryClient.getQueryData([
      "currentMerkleTreeRootVersion",
    ]);

    const treeVersion = currentTreeVersion ? currentTreeVersion + 1 : 1;
    console.log(
      `[FRONTEND/useCreateMerkleTreeRoot] Current Tree Version: ${currentTreeVersion}, New Tree Version: ${treeVersion}`
    );

    return { root, treeVersion, memberCount };
  };

  const insertMerkleTreeRoot = async ({ groupId, rootHash, treeVersion }) => {
    await insertNewMerkleTreeRoot({
      groupId,
      rootHash,
      treeVersion,
    });
  };

  const createMerkleTreeRoot = async ({
    newCommitment,
    onBlockchainSuccess,
    onDatabaseSuccess,
    onError,
  }) => {
    try {
      const { root, treeVersion, memberCount } = await calculateMerkleTreeRoot({
        newCommitment,
      });

      const groupKeyBytes32 = uuidToBytes32(groupId);
      console.log(
        "[FRONTEND/useCreateMerkleTreeRoot] Group Key Bytes32:",
        groupKeyBytes32
      );
      console.log(
        "[FRONTEND/useCreateMerkleTreeRoot] Member Count:",
        memberCount
      );
      console.log(
        "[FRONTEND/useCreateMerkleTreeRoot] Tree Version:",
        treeVersion
      );

      await updateMerkleRoot({
        treeVersion,
        rootValue: root,
        groupKey: groupKeyBytes32,
        memberCount,
      });

      if (onBlockchainSuccess) {
        onBlockchainSuccess({ root, treeVersion, memberCount });
      }

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

      let enhancedError = error;

      if (error.message.includes("Edge function error")) {
        enhancedError = new Error(
          `Blockchain transaction failed: ${error.message}`
        );
      } else if (error.message.includes("Failed to insert")) {
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
