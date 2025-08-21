import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProposalStatus } from "../../../services/apiProposals";

/**
 * Custom hook for updating a proposal's status type
 */
export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ proposalId, statusId }) =>
      updateProposalStatus({ proposalId, statusId }),
    onSuccess: (data, variables) => {
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
