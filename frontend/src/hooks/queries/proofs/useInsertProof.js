import { useMutation } from "@tanstack/react-query";
import { insertProof as insertProofApi } from "../../../services/apiProofs";

/**
 * Custom hook for inserting a proof into the Proofs table
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertProof - Function to insert a proof into the Proofs table
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertProof() {
  const { mutate: insertProof, isLoading, error } = useMutation({
    mutationFn: ({ groupMemberId, groupId, circuitType, nullifierHash, proof, publicSignals }) =>
      insertProofApi({ groupMemberId, groupId, circuitType, nullifierHash, proof, publicSignals }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertProof, isLoading, error };
}
