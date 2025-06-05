import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to fetch merkle tree leaves for the current group.
 * Uses React Query to manage the data fetching state and caching.
 *
 * The query uses a compound key ["groupCommitments", currentGroupId] where:
 * - currentGroupId is retrieved from the query cache using the "currentGroupId" key
 * - The query is only enabled when currentGroupId is available
 *
 * The query function will:
 * - Throw an error if no currentGroupId is available
 * - Call getLeavesByGroupId with the current group ID when available
 *
 * @returns {Object} An object containing:
 *   @property {boolean} isLoading - Indicates if the query is currently loading
 *   @property {Array} groupCommitments - Array of merkle tree leaves for the current group
 *   @property {Error|null} error - Any error that occurred during the query
 *
 * @example
 * const { isLoading, groupCommitments, error } = useGetLeavesByGroupId();
 */
export function useGetLeavesByGroupId() {
  const queryClient = useQueryClient();
  const currentGroupId = queryClient.getQueryData(["currentGroupId"]);

  const {
    isLoading,
    data: groupCommitments,
    error,
  } = useQuery({
    queryKey: ["groupCommitments", currentGroupId],
    queryFn: () => {
      if (!currentGroupId) {
        throw new Error("No current group.");
      }
      return getLeavesByGroupId({ groupId: currentGroupId });
    },
    enabled: !!currentGroupId,
  });

  return { isLoading, groupCommitments, error };
}
