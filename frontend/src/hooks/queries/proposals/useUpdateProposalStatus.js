import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProposalStatus } from "../../../services/apiProposals";

/**
 * Custom hook for updating a proposal's status type
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} updateStatus - Function to update a proposal's status type
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ proposalId, statusId }) =>
      updateProposalStatus({ proposalId, statusId }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch proposals to show updated status
      queryClient.invalidateQueries({
        queryKey: ["proposals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["pendingInboxProposals"],
      });
    },
  });

  return {
    updateStatus: updateStatusMutation.mutate,
    isLoading: updateStatusMutation.isPending,
    error: updateStatusMutation.error,
  };
}
