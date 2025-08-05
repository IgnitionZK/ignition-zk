import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRelayerUpdateRoot } from "../../relayers/useRelayerUpdateRoot";
import { uuidToBytes32 } from "../../../utils/uuidToBytes32";
import { getActiveMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to update the blockchain root when campaigns are created
 * This batches all pending root updates to reduce blockchain transactions
 *
 * @returns {Object} An object containing:
 *   @property {Function} updateBlockchainRoot - Function to trigger the blockchain root update
 *   @property {boolean} isLoading - Whether the update is currently in progress
 *   @property {boolean} isError - Whether the last update attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last update attempt was successful
 *   @property {Object} error - Error object if the update failed
 *   @property {Object} data - Response data from the successful update
 */
export function useUpdateBlockchainRoot() {
  const queryClient = useQueryClient();
  const { updateMerkleRoot } = useRelayerUpdateRoot();

  const mutation = useMutation({
    mutationFn: async ({ groupId, onSuccess, onError }) => {
      try {
        console.log("Starting blockchain root update for campaign creation...");
        console.log("Group ID:", groupId);

        // Get the current active Merkle tree root from the database
        const activeRoot = await getActiveMerkleTreeRoot({ groupId });

        if (!activeRoot) {
          throw new Error("No active Merkle tree root found for this group");
        }

        console.log("Active root from database:", activeRoot);

        // Get the current member count by counting active commitments
        const activeCommitments = await getLeavesByGroupId({ groupId });
        const memberCount = activeCommitments.length;

        if (memberCount === 0) {
          throw new Error("No active commitments found for this group");
        }

        console.log(
          "Member count calculated from active commitments:",
          memberCount
        );

        // Convert the groupId UUID to bytes32 format
        const groupKeyBytes32 = uuidToBytes32(groupId);
        console.log("Group key bytes32:", groupKeyBytes32);

        // Update blockchain with the current active root
        await updateMerkleRoot({
          treeVersion: activeRoot.tree_version,
          rootValue: activeRoot.root_hash,
          groupKey: groupKeyBytes32,
          memberCount: memberCount,
        });

        console.log("Blockchain root update completed successfully");

        if (onSuccess) {
          onSuccess({
            root: activeRoot.root_hash,
            treeVersion: activeRoot.tree_version,
            memberCount: memberCount,
          });
        }

        return {
          root: activeRoot.root_hash,
          treeVersion: activeRoot.tree_version,
          memberCount: memberCount,
        };
      } catch (error) {
        console.error("Error in blockchain root update:", error);
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
  });

  return {
    updateBlockchainRoot: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
