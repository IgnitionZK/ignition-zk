import { useQuery } from "@tanstack/react-query";
import { getStatus } from "../../../services/apiTransactions";

/**
 * Custom hook for getting transaction status by proposal ID
 *
 * This hook fetches the transaction status for a given proposal ID
 * by querying the transactions table using the proposal_id as child_id
 */
export function useGetTransactionStatus(proposalId, options = {}) {
  const {
    enabled = true,
    refetchInterval = 5000, // Refetch every 5 seconds to check for status updates
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: ["transactionStatus", proposalId],
    queryFn: async () => {
      if (!proposalId) {
        return null;
      }
      return await getStatus({ childId: proposalId });
    },
    enabled: enabled && !!proposalId,
    refetchInterval,
    staleTime: 2000, // Consider data stale after 2 seconds
    ...queryOptions,
  });
}
