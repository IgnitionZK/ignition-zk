import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertProposal } from "../../../services/apiProposals";

/**
 * Custom hook for inserting a new proposal
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertProposal - Function to insert a new proposal
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertProposal() {
  const queryClient = useQueryClient();

  const { mutateAsync: insertProposalMutation, isLoading } = useMutation({
    /**
     * Mutation function to insert a new proposal
     * @param {Object} params - The parameters for inserting a proposal
     * @param {string} params.epochId - The ID of the epoch/campaign for this proposal
     * @param {string} params.groupId - The ID of the group this proposal belongs to
     * @param {string} params.groupMemberId - The ID of the group member creating the proposal
     * @param {string} params.title - The title of the proposal
     * @param {string} params.description - The description of the proposal
     * @param {Object} params.metadata - The metadata object (e.g., IPFS CID)
     * @param {Object} params.payload - The payload object containing execution details
     * @param {Object} params.funding - The funding object containing amount and currency
     * @param {string} params.claimHash - The claim hash for the proposal (optional)
     * @param {string} params.statusId - The status ID for the proposal (optional)
     * @param {string} params.contextKey - The context key for the proposal (computed from group and epoch)
     * @returns {Promise} A promise that resolves when the proposal is inserted
     */
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
      // Invalidate and refetch proposals queries
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (err) => {
      console.error("Error inserting proposal:", err);
    },
  });

  return { insertProposal: insertProposalMutation, isLoading };
}
