import { useQueryClient } from "@tanstack/react-query";
import { MerkleTreeService } from "../../../scripts/merkleTreeService";
import { useInsertMerkleTreeRoot } from "./useInsertMerkleTreeRoot";
import { useGetLeavesByGroupId } from "../merkleTreeLeaves/useGetLeavesByGroupId";

/**
 * Custom hook for creating and inserting a new Merkle tree root
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group
 * @param {BigInt} params.newCommitment - The new commitment to add
 * @returns {Object} Object containing the createMerkleTreeRoot function and loading states
 */
export const useCreateMerkleTreeRoot = () => {
  const queryClient = useQueryClient();
  const { mutate: insertNewMerkleTreeRoot, isLoading: isLoadingInsertRoot } =
    useInsertMerkleTreeRoot();
  const { groupCommitments, isLoading: isLoadingCommitments } =
    useGetLeavesByGroupId();

  const createMerkleTreeRoot = async ({ groupId, newCommitment }) => {
    // Create array of all commitment values
    const allCommitments = [
      ...(groupCommitments || []).map((commitment) =>
        BigInt(commitment.commitment_value)
      ),
      newCommitment,
    ];

    // Create new merkle tree with all commitments
    const { root } = await MerkleTreeService.createMerkleTree(allCommitments);

    const currentTreeVersion = queryClient.getQueryData([
      "currentMerkleTreeRootVersion",
    ]);

    // Calculate the tree version
    const treeVersion = currentTreeVersion ? currentTreeVersion + 1 : 1;

    // Insert the new Merkle tree root
    await insertNewMerkleTreeRoot({
      groupId,
      rootHash: root,
      treeVersion: treeVersion,
    });

    return { root, treeVersion };
  };

  return {
    createMerkleTreeRoot,
    isLoading: isLoadingInsertRoot || isLoadingCommitments,
  };
};
