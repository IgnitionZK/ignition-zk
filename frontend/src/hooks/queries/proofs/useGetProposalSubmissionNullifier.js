import { useQuery } from "@tanstack/react-query";
import { getProposalSubmissionNullifier } from "../../../services/apiProofs";

/**
 * Custom hook to fetch the proposal submission nullifier for a specific proposal.
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
