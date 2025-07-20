import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupMemberId } from "../../../services/apiGroupMembers";

/**
 * Custom hook to fetch the group member ID for a specific group
 *
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to get the member ID for
 * @returns {Object} Object containing:
 *   - isLoading: boolean - Loading state of the query
 *   - groupMemberId: string | null - The group member ID if found
 *   - error: Error | null - Error state of the query
 *
 * @notes
 *   - queryKey: ["groupMemberId", userId, groupId] - Query key includes user and group IDs
 *   - queryFn: Fetches group member ID using getGroupMemberId API call
 *   - Requires valid user ID and group ID
 *   - Only enabled when both user ID and group ID exist
 */
export function useGetGroupMemberId({ groupId }) {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(["user"]);

  const {
    isLoading,
    data: groupMemberId,
    error,
  } = useQuery({
    queryKey: ["groupMemberId", user?.id, groupId],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("No user ID available");
      }
      if (!groupId) {
        throw new Error("No group ID provided");
      }
      return getGroupMemberId({ userId: user.id, groupId });
    },
    enabled: !!user?.id && !!groupId,
  });

  return { isLoading, groupMemberId, error };
}
