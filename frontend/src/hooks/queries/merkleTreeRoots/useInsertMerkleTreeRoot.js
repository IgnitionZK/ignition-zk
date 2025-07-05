import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";
import { useToggleMerkleTreeRootActive } from "./useToggleMerkleTreeRootActive";

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
  const { toggleRootActive, isLoading: isLoadingToggle } =
    useToggleMerkleTreeRootActive();

  const {
    mutate,
    isLoading: isLoadingInsert,
    error,
  } = useMutation({
    mutationFn: ({ groupId, rootHash, treeVersion }) =>
      insertMerkleTreeRoot({ groupId, rootHash, treeVersion }),
    onSuccess: async (newRoot, variables) => {
      // Use the new atomic toggle function instead of sequential updates
      await toggleRootActive({
        groupId: variables.groupId,
        newRootId: newRoot.root_id,
      });

      // Update the current tree version in the cache
      queryClient.setQueryData(
        ["currentMerkleTreeRootVersion"],
        variables.treeVersion
      );
    },
  });

  const insertNewMerkleTreeRoot = (params) => {
    return new Promise((resolve, reject) => {
      mutate(params, {
        onSuccess: (data) => {
          resolve(data);
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return {
    mutate,
    insertNewMerkleTreeRoot,
    isLoading: isLoadingInsert || isLoadingToggle,
    error,
  };
}
