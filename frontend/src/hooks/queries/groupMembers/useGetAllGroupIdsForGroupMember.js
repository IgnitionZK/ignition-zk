import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllGroupIdsForGroupMember } from "../../../services/apiGroupMembers";

export function useGetAllGroupIdsForGroupMember() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(["user"]);

  const {
    isLoading,
    data: groupIds,
    error,
  } = useQuery({
    queryKey: ["groupIds", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("No user ID available");
      }
      return getAllGroupIdsForGroupMember({ userId: user.id });
    },
    enabled: !!user?.id,
  });

  return { isLoading, groupIds, error };
}
