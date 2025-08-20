import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../../services/supabase";

/**
 * Hook for atomically inserting a commitment into the merkle tree.
 * This hook handles the insertion of a new commitment value for a group member,
 * ensuring atomicity through a database RPC function. It returns a mutation
 * function along with loading and error states.
 */
export const useAtomicCommitmentInsertion = () => {
  const mutation = useMutation({
    mutationFn: async ({
      groupId,
      groupMemberId,
      commitment,
      onSuccess,
      onError,
    }) => {
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "atomic_commitment_insertion",
          {
            p_group_id: groupId,
            p_group_member_id: groupMemberId,
            p_commitment_value: commitment.toString(),
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!rpcResult.success) {
          throw new Error("Commitment insertion failed");
        }

        if (onSuccess) {
          onSuccess({
            memberCount: rpcResult.member_count,
            commitmentId: rpcResult.commitment_id,
          });
        }

        return rpcResult;
      } catch (error) {
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
