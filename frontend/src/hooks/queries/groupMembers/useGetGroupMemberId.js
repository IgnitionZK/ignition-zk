import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupMemberId } from "../../../services/apiGroupMembers";

/**
 * Custom hook to fetch a group member ID for a specific user and group.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to check membership for
 *
 * @returns {Object} An object containing:
 *   - isLoading: boolean indicating if the query is in progress
 *   - groupMemberId: string | undefined - The ID of the group member if found
 *   - error: Error | null - Any error that occurred during the query
 *
 * @notes
 * -queryKey ["groupMemberId", userId, groupId]
 * - The query key is composed of:
 * - "groupMemberId": Base key for this query type
 * - userId: The ID of the current user
 * - groupId: The ID of the group being checked
 *
 * - queryFn
 * The query function:
 * - Requires both userId and groupId to be present
 * - Throws an error if either userId or groupId is missing
 * - Calls getGroupMemberId service with the required parameters
 * - Only enabled when both userId and groupId are available
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
        throw new Error("No group ID available");
      }
      return getGroupMemberId({ userId: user.id, groupId });
    },
    enabled: !!user?.id && !!groupId,
  });

  return { isLoading, groupMemberId, error };
}
