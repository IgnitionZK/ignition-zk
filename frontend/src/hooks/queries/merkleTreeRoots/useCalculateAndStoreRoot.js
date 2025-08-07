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
 *
 * @returns {Object} An object containing the mutation function and its state
 * @property {Function} calculateAndStoreRoot - Function to trigger the root calculation and storage
 * @property {boolean} isLoading - Whether the mutation is in progress
 * @property {Error|null} error - Any error that occurred during the mutation
 */
export const useCalculateAndStoreRoot = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ groupId, onSuccess, onError }) => {
      try {
        console.log("Starting root calculation and storage...");
        console.log("Group ID:", groupId);

        // Step 1: Get current active root for comparison
        const existingActiveRoot = await getActiveMerkleTreeRoot({ groupId });
        console.log("Existing active root:", existingActiveRoot);

        // Step 2: Get all active commitments for the group
        const activeCommitments = await getLeavesByGroupId({ groupId });
        console.log("Active commitments count:", activeCommitments.length);

        if (activeCommitments.length === 0) {
          throw new Error("No active commitments found for this group");
        }

        // Step 3: Convert commitments to BigInt and calculate new root
        const allCommitments = activeCommitments.map((c) =>
          BigInt(c.commitment_value)
        );
        console.log("Converted commitments:", allCommitments);

        const { root } = await MerkleTreeService.createMerkleTree(
          allCommitments
        );
        console.log("Calculated new root:", root);

        // Step 4: Compare with existing root
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

        // Step 5: Root is different, proceed with insertion
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

        // Step 6: Toggle active status (deactivate old, activate new)
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

        // Update the current tree version in the cache
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
