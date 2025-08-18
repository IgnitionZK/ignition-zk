import { useQuery } from "@tanstack/react-query";
import { getPendingInboxProposals } from "../../../services/apiProposals";

/**
 * Custom hook to fetch pending inbox proposals for a list of user groups
 * This hook returns proposals that are active AND the current user has not voted on yet
 * @param {Array<{group_id: string, group_member_id: string}>} userGroups - Array of user group objects containing group_id and group_member_id
 * @returns {Object} Object containing loading state, proposals data, and error state
 * @property {boolean} isLoading - Loading state of the query
 * @property {Array} proposals - Array of proposals data
 * @property {Error} error - Error object if query fails
 */
export function useGetPendingInboxProposals(userGroups) {
  const groupIds = userGroups?.map((group) => group.group_id) || [];
  const groupMemberIds =
    userGroups?.map((group) => group.group_member_id) || [];

  const {
    isLoading,
    data: proposals,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pendingInboxProposals", groupIds, groupMemberIds],
    queryFn: () => {
      if (!userGroups?.length) {
        throw new Error("No groups.");
      }

      // For now, we'll use the first group member ID since the API expects a single ID
      // In the future, this could be enhanced to handle multiple group member IDs
      const groupMemberId = groupMemberIds[0];

      return getPendingInboxProposals({ groupId: groupIds, groupMemberId });
    },
    enabled: !!userGroups?.length && !!groupMemberIds.length,
  });

  return { isLoading, proposals, error, refetch };
}
