import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to fetch merkle tree leaves for a specific group or the current group.
 * Uses React Query to manage the data fetching state and caching.
 *
 * @param {Object} params - The parameters object
 * @param {string} [params.groupId] - The ID of the group to fetch leaves for. If not provided, uses currentGroupId from cache.
 *
 * The query uses a compound key ["groupCommitments", groupId] where:
 * - groupId is either the provided parameter or retrieved from the query cache using the "currentGroupId" key
 * - The query is only enabled when groupId is available
 *
 * The query function will:
 * - Throw an error if no groupId is available
 * - Call getLeavesByGroupId with the group ID when available
 *
 * @returns {Object} An object containing:
 *   @property {boolean} isLoading - Indicates if the query is currently loading
 *   @property {Array} groupCommitments - Array of merkle tree leaves for the specified group
 *   @property {Error|null} error - Any error that occurred during the query
 *
 * @example
 * // Use current group from cache
 * const { isLoading, groupCommitments, error } = useGetLeavesByGroupId();
 *
 * // Use specific group
 * const { isLoading, groupCommitments, error } = useGetLeavesByGroupId({ groupId: "group-123" });
 */
export function useGetLeavesByGroupId({ groupId } = {}) {
  const queryClient = useQueryClient();
  const effectiveGroupId =
    groupId || queryClient.getQueryData(["currentGroupId"]);

  const {
    isLoading,
    data: groupCommitments,
    error,
  } = useQuery({
    queryKey: ["groupCommitments", effectiveGroupId],
    queryFn: () => {
      if (!effectiveGroupId) {
        throw new Error("No group ID available.");
      }
      return getLeavesByGroupId({ groupId: effectiveGroupId });
    },
    enabled: !!effectiveGroupId,
  });

  return { isLoading, groupCommitments, error };
}
