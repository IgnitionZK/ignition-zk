import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  insertMerkleTreeRoot,
  updateMerkleTreeRootActiveStatus,
} from "../../../services/apiMerkleTreeRoots";

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
