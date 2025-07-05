import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleMerkleTreeRootActive } from "../../../services/apiMerkleTreeRoots";

/**
 * Custom hook for atomically toggling Merkle tree root active status.
 * This hook handles the process of deactivating all current active roots
 * and activating the specified new root in a single atomic operation.
 *
 * @returns {Object} An object containing the mutation function and its state
 * @property {Function} toggleRootActive - Function to trigger the atomic toggle
 * @property {boolean} isLoading - Whether the mutation is in progress
 * @property {Error|null} error - Any error that occurred during the mutation
 */
export function useToggleMerkleTreeRootActive() {
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation({
    mutationFn: ({ groupId, newRootId }) =>
      toggleMerkleTreeRootActive({ groupId, newRootId }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch the active merkle tree root query
      queryClient.invalidateQueries({
        queryKey: ["merkleTreeRoot", "active", variables.groupId],
      });
    },
  });

  const toggleRootActive = (params) => {
    return new Promise((resolve, reject) => {
      mutate(params, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return {
    toggleRootActive,
    isLoading,
    error,
  };
}
