import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleMerkleTreeRootActive } from "../../../services/apiMerkleTreeRoots";

/**
 * Custom hook for atomically toggling Merkle tree root active status.
 * This hook handles the process of deactivating all current active roots
 * and activating the specified new root in a single atomic operation.
 */
export function useToggleMerkleTreeRootActive() {
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation({
    mutationFn: ({ groupId, newRootId }) =>
      toggleMerkleTreeRootActive({ groupId, newRootId }),
    onSuccess: (_, variables) => {
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
