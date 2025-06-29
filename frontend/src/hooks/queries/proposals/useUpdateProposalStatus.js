import { useMutation } from "@tanstack/react-query";
import { updateProposalStatus } from "../../../services/apiProposals";

/**
 * Custom hook for updating a proposal's status type
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} updateStatus - Function to update a proposal's status type
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useUpdateProposalStatus() {
  const { mutate: updateStatus, isLoading } = useMutation({
    /**
     * Mutation function to update a proposal's status type
     * @param {Object} params - The parameters for updating a proposal's status type
     * @param {string} params.proposalId - The ID of the proposal to update
     * @param {string} params.statusType - The new status type value
     * @returns {Promise} A promise that resolves when the status type is updated
     */
    mutationFn: ({ proposalId, statusType }) =>
      updateProposalStatus({ proposalId, statusType }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { updateStatus, isLoading };
}
