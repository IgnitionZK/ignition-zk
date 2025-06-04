import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

export function useGetLeavesByGroupId() {
  const queryClient = useQueryClient();
  const currentGroupId = queryClient.getQueryData(["currentGroupId"]);

  const {
    isLoading,
    data: groupCommitments,
    error,
  } = useQuery({
    queryKey: ["groupCommitments", currentGroupId],
    queryFn: () => {
      if (!currentGroupId) {
        throw new Error("No current group.");
      }
      return getLeavesByGroupId({ groupId: currentGroupId });
    },
    enabled: !!currentGroupId,
  });

  return { isLoading, groupCommitments, error };
}
