import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserGroups } from "../../../services/apiGroupMembers";

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
