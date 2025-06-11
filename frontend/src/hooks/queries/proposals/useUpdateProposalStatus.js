import { useMutation } from "@tanstack/react-query";
import { updateProposalStatus } from "../../../services/apiProposals";

/**
 * Custom hook for updating a proposal's status
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} updateStatus - Function to update a proposal's status
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useUpdateProposalStatus() {
  const { mutate: updateStatus, isLoading } = useMutation({
    /**
     * Mutation function to update a proposal's status
     * @param {Object} params - The parameters for updating a proposal's status
     * @param {string} params.proposalId - The ID of the proposal to update
     * @param {string} params.status - The new status value
     * @returns {Promise} A promise that resolves when the status is updated
     */
    mutationFn: ({ proposalId, status }) =>
      updateProposalStatus({ proposalId, status }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { updateStatus, isLoading };
}
