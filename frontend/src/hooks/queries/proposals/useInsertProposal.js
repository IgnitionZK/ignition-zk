import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertProposal } from "../../../services/apiProposals";

/**
 * Custom hook for inserting a new proposal
 */
export function useInsertProposal() {
  const queryClient = useQueryClient();

  const { mutateAsync: insertProposalMutation, isLoading } = useMutation({
    mutationFn: ({
      epochId,
      groupId,
      groupMemberId,
      title,
      description,
      metadata,
      payload,
      funding,
      claimHash,
      statusId,
      contextKey,
    }) =>
      insertProposal({
        epochId,
        groupId,
        groupMemberId,
        title,
        description,
        metadata,
        payload,
        funding,
        claimHash,
        statusId,
        contextKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "proposals",
      });
    },
    onError: (err) => {
      console.error("Error inserting proposal:", err);
    },
  });

  return { insertProposal: insertProposalMutation, isLoading };
}
