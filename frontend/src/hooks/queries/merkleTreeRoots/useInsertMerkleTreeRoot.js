import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  insertMerkleTreeRoot,
  updateMerkleTreeRootActiveStatus,
} from "../../../services/apiMerkleTreeRoots";

/**
 * Custom hook for inserting a new Merkle tree root and managing its active status.
 * This hook handles the process of inserting a new root, deactivating the current root,
 * and updating the cache with the new tree version.
 *
 * @returns {Object} An object containing the mutation function and its state
 * @property {Function} mutate - Function to trigger the mutation
 * @property {boolean} isLoading - Whether the mutation is in progress
 * @property {Error|null} error - Any error that occurred during the mutation
 */
export function useInsertMerkleTreeRoot() {
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation({
    mutationFn: ({ groupId, rootHash, treeVersion }) =>
      insertMerkleTreeRoot({ groupId, rootHash, treeVersion }),
    onSuccess: async (newRoot, variables) => {
      // Get the current root ID from the cache
      const currentRootId = queryClient.getQueryData("currentRootId");

      // If there's a current root, deactivate it
      if (currentRootId) {
        await updateMerkleTreeRootActiveStatus({
          rootId: currentRootId,
          isActive: false,
        });
      }

      // Set the new root as active
      await updateMerkleTreeRootActiveStatus({
        rootId: newRoot.root_id,
        isActive: true,
      });

      // Update the current tree version in the cache
      queryClient.setQueryData(
        ["currentMerkleTreeRootVersion"],
        variables.treeVersion
      );

      // Invalidate and refetch the active merkle tree root query
      queryClient.invalidateQueries({
        queryKey: ["merkleTreeRoot", "active", variables.groupId],
      });
    },
  });

  return {
    mutate,
    isLoading,
    error,
  };
}
