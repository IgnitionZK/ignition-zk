import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserGroups } from "../../../services/apiGroupMembers";

/**
 * Custom hook to fetch and manage user groups data
 *
 * @returns {Object} Object containing:
 *   - isLoading: boolean - Loading state of the query
 *   - userGroups: Array - List of user groups
 *   - error: Error | null - Error state of the query
 *
 * @notes
 *   - queryKey
 *   - ["userGroups", userId] - Query key includes:
 *   - "userGroups": Base key for user groups data
 *   - userId: User ID to fetch groups for
 *
 *    - queryFn
 *    - Fetches user groups using getUserGroups API call
 *    - Requires valid user ID from queryClient
 *    - Throws error if no user ID is available
 *    - Only enabled when user ID exists
 */
export function useGetUserGroups() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(["user"]);

  const {
    isLoading,
    data: userGroups,
    error,
  } = useQuery({
    queryKey: ["userGroups", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("No user ID available");
      }
      return getUserGroups({ userId: user.id });
    },
    enabled: !!user?.id,
  });

  return { isLoading, userGroups, error };
}
