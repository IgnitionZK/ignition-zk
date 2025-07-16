import { useQuery } from "@tanstack/react-query";
import { getEpochsByGroupId } from "../../../services/apiEpochs";

/**
 * Custom hook to fetch epochs by group ID
 *
 * @param {string} groupId - The group ID to fetch epochs for
 * @returns {Object} Object containing:
 *   - isLoading: boolean - Loading state of the query
 *   - epochs: Array - List of epochs for the group
 *   - error: Error | null - Error state of the query
 *
 * @notes
 *   - queryKey: ["epochsByGroupId", groupId]
 *   - Only enabled when groupId is provided
 */
export function useGetEpochsByGroupId(groupId) {
  const {
    isLoading,
    data: epochs,
    error,
  } = useQuery({
    queryKey: ["epochsByGroupId", groupId],
    queryFn: () => getEpochsByGroupId(groupId),
    enabled: !!groupId,
  });

  return { isLoading, epochs, error };
}
