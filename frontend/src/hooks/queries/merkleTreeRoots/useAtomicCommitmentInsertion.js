import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../services/supabase";
import { MerkleTreeService } from "../../../scripts/merkleTreeService";
import { uuidToBytes32 } from "../../../utils/uuidToBytes32";
import { insertMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";
import { toggleMerkleTreeRootActive } from "../../../services/apiMerkleTreeRoots";

export const useAtomicCommitmentInsertion = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      groupId,
      groupMemberId,
      commitment,
      onSuccess,
      onError,
    }) => {
      try {
        console.log("Starting atomic commitment insertion...");
        console.log("Group ID:", groupId);
        console.log("Group Member ID:", groupMemberId);
        console.log("Commitment:", commitment.toString());

        // Step 1: Call RPC function to insert commitment and get all commitments
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "atomic_commitment_insertion",
          {
            p_group_id: groupId,
            p_group_member_id: groupMemberId,
            p_commitment_value: commitment.toString(),
          }
        );

        console.log("RPC Result:", rpcResult);
        console.log("RPC Error:", rpcError);

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!rpcResult.success) {
          throw new Error("Commitment insertion failed");
        }

        // Step 2: Calculate root with the fresh commitments from database
        console.log("All commitments from RPC:", rpcResult.all_commitments);
        const allCommitments = rpcResult.all_commitments.map((c) => BigInt(c));
        console.log("Converted commitments:", allCommitments);

        const { root } = await MerkleTreeService.createMerkleTree(
          allCommitments
        );
        console.log("Calculated root:", root);

        // Step 3: Get tree version from RPC result (already calculated atomically)
        const treeVersion = rpcResult.tree_version;
        console.log("Tree version from RPC (atomic):", treeVersion);

        // Step 4: Insert the new Merkle tree root into database FIRST
        console.log("Inserting root into database...");
        const newRootRecord = await insertMerkleTreeRoot({
          groupId,
          rootHash: root,
          treeVersion: treeVersion,
        });
        console.log("Root inserted into database:", newRootRecord);

        // Step 5: Toggle active status (deactivate old, activate new)
        console.log("Toggling root active status...");
        await toggleMerkleTreeRootActive({
          groupId: groupId,
          newRootId: newRootRecord.root_id,
        });
        console.log("Root active status updated");

        // Note: Blockchain update has been moved to campaign creation
        // This reduces blockchain transactions by batching root updates

        if (onSuccess) {
          onSuccess({
            root: root,
            treeVersion: treeVersion,
            memberCount: rpcResult.member_count,
            rootId: newRootRecord.root_id,
          });
        }

        // Update the current tree version in the cache
        queryClient.setQueryData(["currentMerkleTreeRootVersion"], treeVersion);

        return {
          ...rpcResult,
          calculated_root: root,
          tree_version: treeVersion,
          root_id: newRootRecord.root_id,
        };
      } catch (error) {
        console.error("Error in atomic commitment insertion:", error);
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
  });

  return {
    insertCommitment: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
