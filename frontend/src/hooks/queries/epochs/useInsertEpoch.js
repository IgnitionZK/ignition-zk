import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertEpoch } from "../../../services/apiEpochs";

/**
 * Custom hook to insert a new epoch
 *
 * @returns {Object} Object containing:
 *   - insertEpoch: function - Function to insert new epoch
 *   - isLoading: boolean - Loading state of the mutation
 *   - error: Error | null - Error state of the mutation
 *
 * @notes
 *   - Uses React Query's useMutation for optimistic updates
 *   - Automatically invalidates related queries after successful insertion
 */
export function useInsertEpoch() {
  const queryClient = useQueryClient();

  const {
    mutate: insertEpochMutation,
    isLoading,
    error,
  } = useMutation({
    mutationFn: insertEpoch,
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(["epochsByGroupId", variables.group_id]);
      queryClient.invalidateQueries(["userEpochs"]);
    },
  });

  return {
    insertEpoch: insertEpochMutation,
    isLoading,
    error,
  };
}
