import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getGroupMemberId } from "../../../services/apiGroupMembers";

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
