import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserGroups } from "../../../services/apiGroupMembers";

/**
 * Custom hook to fetch and manage user groups data.
 *
 * This hook retrieves all groups that a user is a member of by querying the user's ID
 * from the query client cache. It automatically handles loading states, error handling,
 * and only executes the query when a valid user ID is available.

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
