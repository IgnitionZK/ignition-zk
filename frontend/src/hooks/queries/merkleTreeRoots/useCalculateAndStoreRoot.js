import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MerkleTreeService } from "../../../scripts/merkleTreeService";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";
import { insertMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";
import { toggleMerkleTreeRootActive } from "../../../services/apiMerkleTreeRoots";
import { getActiveMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";

/**
 * Custom hook for calculating and storing Merkle tree root during campaign creation
 * This hook calculates the root from all active commitments and stores it in the database
 * Only inserts a new root if it differs from the current active root
 */
export const useCalculateAndStoreRoot = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ groupId, onSuccess, onError }) => {
      try {
        console.log("Starting root calculation and storage...");
        console.log("Group ID:", groupId);

        const existingActiveRoot = await getActiveMerkleTreeRoot({ groupId });
        console.log("Existing active root:", existingActiveRoot);

        const activeCommitments = await getLeavesByGroupId({ groupId });
        console.log("Active commitments count:", activeCommitments.length);

        if (activeCommitments.length === 0) {
          throw new Error("No active commitments found for this group");
        }

        const allCommitments = activeCommitments.map((c) =>
          BigInt(c.commitment_value)
        );
        console.log("Converted commitments:", allCommitments);

        const { root } = await MerkleTreeService.createMerkleTree(
          allCommitments
        );
        console.log("Calculated new root:", root);

        if (existingActiveRoot && existingActiveRoot.root_hash === root) {
          console.log("Root is unchanged, skipping database insertion");

          if (onSuccess) {
            onSuccess({
              root: root,
              treeVersion: existingActiveRoot.tree_version,
              memberCount: activeCommitments.length,
              rootId: existingActiveRoot.root_id,
              rootUnchanged: true,
            });
          }

          return {
            root: root,
            treeVersion: existingActiveRoot.tree_version,
            memberCount: activeCommitments.length,
            rootId: existingActiveRoot.root_id,
            rootUnchanged: true,
          };
        }

        console.log("Root has changed, inserting new root into database...");
        const treeVersion = existingActiveRoot
          ? existingActiveRoot.tree_version + 1
          : 1;
        console.log("New tree version:", treeVersion);

        const newRootRecord = await insertMerkleTreeRoot({
          groupId,
          rootHash: root,
          treeVersion: treeVersion,
        });
        console.log("Root inserted into database:", newRootRecord);

        console.log("Toggling root active status...");
        await toggleMerkleTreeRootActive({
          groupId: groupId,
          newRootId: newRootRecord.root_id,
        });
        console.log("Root active status updated");

        if (onSuccess) {
          onSuccess({
            root: root,
            treeVersion: treeVersion,
            memberCount: activeCommitments.length,
            rootId: newRootRecord.root_id,
            rootUnchanged: false,
          });
        }

        queryClient.setQueryData(["currentMerkleTreeRootVersion"], treeVersion);

        return {
          root: root,
          treeVersion: treeVersion,
          memberCount: activeCommitments.length,
          rootId: newRootRecord.root_id,
          rootUnchanged: false,
        };
      } catch (error) {
        console.error("Error in root calculation and storage:", error);
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
  });

  return {
    calculateAndStoreRoot: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
