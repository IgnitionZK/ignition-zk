import { useMutation } from "@tanstack/react-query";
import { insertProof } from "../../../services/apiProofs";

/**
 * Custom hook for inserting a new proof
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertProof - Function to insert a new proof
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertProof() {
  const { mutate: insertProofMutation, isLoading } = useMutation({
    /**
     * Mutation function to insert a new proof
     * @param {Object} params - The parameters for inserting a proof
     * @param {string} params.proposalId - The ID of the proposal
     * @param {string} params.proof - The proof data
     * @param {string} params.publicInputs - The public inputs
     * @param {string} params.groupId - The ID of the group
     * @param {string} params.groupMemberId - The ID of the group member
     * @param {string} params.nullifierHash - The nullifier hash
     * @returns {Promise} A promise that resolves when the proof is inserted
     */
    mutationFn: ({
      proposalId,
      proof,
      publicInputs,
      groupId,
      groupMemberId,
      nullifierHash,
    }) =>
      insertProof({
        proposalId,
        proof,
        publicInputs,
        groupId,
        groupMemberId,
        nullifierHash,
      }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertProof: insertProofMutation, isLoading };
}
