import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to fetch merkle tree leaves (commitments) for a specific group or the current group.
 *
 * This hook automatically determines the group ID to use - either from the provided groupId parameter
 * or by falling back to the current group ID stored in the query client. It returns the loading state,
 * group commitments data, and any error that occurred during the fetch operation.
 *
 * The hook is only enabled when a valid group ID is available and uses React Query for efficient
 * data fetching, caching, and state management.
 */
export function useGetLeavesByGroupId({ groupId } = {}) {
  const queryClient = useQueryClient();
  const effectiveGroupId =
    groupId || queryClient.getQueryData(["currentGroupId"]);

  const {
    isLoading,
    data: groupCommitments,
    error,
  } = useQuery({
    queryKey: ["groupCommitments", effectiveGroupId],
    queryFn: () => {
      if (!effectiveGroupId) {
        throw new Error("No group ID available.");
      }
      return getLeavesByGroupId({ groupId: effectiveGroupId });
    },
    enabled: !!effectiveGroupId,
  });

  return { isLoading, groupCommitments, error };
}
