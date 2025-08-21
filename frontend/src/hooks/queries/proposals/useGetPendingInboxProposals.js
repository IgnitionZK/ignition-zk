import { useQuery } from "@tanstack/react-query";
import { getPendingInboxProposals } from "../../../services/apiProposals";

/**
 * Custom hook to fetch pending inbox proposals for a list of user groups
 * This hook returns proposals that are active AND the current user has not voted on yet
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

      const groupMemberId = groupMemberIds[0];

      return getPendingInboxProposals({ groupId: groupIds, groupMemberId });
    },
    enabled: !!userGroups?.length && !!groupMemberIds.length,
  });

  return { isLoading, proposals, error, refetch };
}
