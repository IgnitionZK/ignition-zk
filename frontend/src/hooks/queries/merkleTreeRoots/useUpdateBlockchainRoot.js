import { useMutation } from "@tanstack/react-query";
import { useRelayerUpdateRoot } from "../../relayers/useRelayerUpdateRoot";
import { uuidToBytes32 } from "../../../scripts/utils/uuidToBytes32";
import { getActiveMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to update the blockchain root when campaigns are created.
 * This batches all pending root updates to reduce blockchain transactions.
 * The hook fetches the current active Merkle tree root from the database,
 * calculates the member count from active commitments, and updates the
 * blockchain with the current root hash and member count.
 */
export function useUpdateBlockchainRoot() {
  const { updateMerkleRoot } = useRelayerUpdateRoot();

  const mutation = useMutation({
    mutationFn: async ({ groupId, onSuccess, onError }) => {
      try {
        console.log("Starting blockchain root update for campaign creation...");
        console.log("Group ID:", groupId);

        const activeRoot = await getActiveMerkleTreeRoot({ groupId });

        if (!activeRoot) {
          throw new Error("No active Merkle tree root found for this group");
        }

        console.log("Active root from database:", activeRoot);

        const activeCommitments = await getLeavesByGroupId({ groupId });
        const memberCount = activeCommitments.length;

        if (memberCount === 0) {
          throw new Error("No active commitments found for this group");
        }

        console.log(
          "Member count calculated from active commitments:",
          memberCount
        );

        const groupKeyBytes32 = uuidToBytes32(groupId);
        console.log("Group key bytes32:", groupKeyBytes32);

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
