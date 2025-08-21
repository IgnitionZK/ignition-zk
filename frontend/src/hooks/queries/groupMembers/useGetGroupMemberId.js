import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupMemberId } from "../../../services/apiGroupMembers";

/**
 * Custom hook to fetch the group member ID for a specific user and group combination.
 * Returns the group member ID along with loading state and error handling.
 * The query is only enabled when both user ID and group ID are available.
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
