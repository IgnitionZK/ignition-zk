import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupMemberId } from "../../../services/apiGroupMembers";

export function useGetGroupMemberId() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(["user"]);

  const {
    isLoading,
    data: groupMemberId,
    error,
  } = useQuery({
    queryKey: ["groupMemberId", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("No user ID available");
      }
      return getGroupMemberId({ userId: user.id });
    },
    enabled: !!user?.id,
  });

  return { isLoading, groupMemberId, error };
}
