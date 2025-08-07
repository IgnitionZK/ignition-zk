import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../services/supabase";

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

        // Step 1: Call RPC function to insert commitment
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

        console.log("Commitment inserted successfully");

        if (onSuccess) {
          onSuccess({
            memberCount: rpcResult.member_count,
            commitmentId: rpcResult.commitment_id,
          });
        }

        return rpcResult;
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
