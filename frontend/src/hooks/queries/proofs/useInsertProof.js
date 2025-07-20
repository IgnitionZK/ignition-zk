import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertProof } from "../../../services/apiProofs";

/**
 * Custom hook for inserting a new proof
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertProof - Function to insert a new proof
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertProof() {
  const queryClient = useQueryClient();

  const { mutateAsync: insertProofMutation, isLoading } = useMutation({
    /**
     * Mutation function to insert a new proof
     * @param {Object} params - The parameters for inserting a proof
     * @param {string} params.proposalId - The ID of the proposal
     * @param {string} params.groupId - The ID of the group
     * @param {string} params.groupMemberId - The ID of the group member
     * @param {string} params.nullifierHash - The nullifier hash
     * @param {string} params.circuitType - The type of circuit used
     * @returns {Promise} A promise that resolves when the proof is inserted
     */
    mutationFn: ({
      proposalId,
      groupId,
      groupMemberId,
      nullifierHash,
      circuitType,
    }) =>
      insertProof({
        proposalId,
        groupId,
        groupMemberId,
        nullifierHash,
        circuitType,
      }),
    onSuccess: () => {
      // Invalidate and refetch proofs queries
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
    },
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertProof: insertProofMutation, isLoading };
}
