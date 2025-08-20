import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertProof } from "../../../services/apiProofs";

/**
 * Custom hook for inserting a new ZK proof into the system
 * This hook provides a mutation function to submit zero-knowledge proofs for various
 * circuit types (membership, proposal, proposal-claim, vote) along with their associated
 * metadata. It automatically invalidates and refetches proofs queries on successful
 * submission to keep the UI in sync.
 */
export function useInsertProof() {
  const queryClient = useQueryClient();

  const { mutateAsync: insertProofMutation, isLoading } = useMutation({
    mutationFn: ({
      proposalId,
      groupId,
      groupMemberId,
      nullifierHash,
      circuitType,
      proof,
      publicSignals,
      contextKey,
    }) =>
      insertProof({
        proposalId,
        groupId,
        groupMemberId,
        nullifierHash,
        circuitType,
        proof,
        publicSignals,
        contextKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertProof: insertProofMutation, isLoading };
}
