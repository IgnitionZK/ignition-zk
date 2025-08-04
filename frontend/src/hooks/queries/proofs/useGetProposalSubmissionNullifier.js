import { useQuery } from "@tanstack/react-query";
import { getProposalSubmissionNullifier } from "../../../services/apiProofs";

/**
 * Custom hook to fetch the proposal submission nullifier for a specific proposal.
 *
 * @param {string} proposalId - The unique identifier of the proposal
 * @returns {Object} An object containing:
 *   @property {boolean} isLoading - Indicates if the query is currently loading
 *   @property {string|null} nullifierHash - The proposal submission nullifier hash, or null if not found
 *   @property {Error|null} error - Any error that occurred during the query
 *
 * @example
 * const { isLoading, nullifierHash, error } = useGetProposalSubmissionNullifier("proposal123");
 */
export function useGetProposalSubmissionNullifier(proposalId) {
  const {
    isLoading,
    data: nullifierHash,
    error,
  } = useQuery({
    queryKey: ["proposalSubmissionNullifier", proposalId],
    queryFn: () => {
      if (!proposalId) {
        throw new Error("No proposal ID provided.");
      }

      return getProposalSubmissionNullifier(proposalId);
    },
    enabled: !!proposalId,
  });

  return { isLoading, nullifierHash, error };
}
