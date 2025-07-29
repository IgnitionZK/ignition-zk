import { useQuery } from "@tanstack/react-query";
import { getPendingInboxProposals } from "../../../services/apiProposals";

/**
 * Custom hook to fetch pending inbox proposals for a list of user groups
 * This hook returns proposals that are active AND have no associated voting proof
 * @param {Array<{group_id: string}>} userGroups - Array of user group objects containing group_id
 * @returns {Object} Object containing loading state, proposals data, and error state
 * @property {boolean} isLoading - Loading state of the query
 * @property {Array} proposals - Array of proposals data
 * @property {Error} error - Error object if query fails
 */
export function useGetPendingInboxProposals(userGroups) {
  const groupIds = userGroups?.map((group) => group.group_id) || [];

  const {
    isLoading,
    data: proposals,
    error,
  } = useQuery({
    queryKey: ["pendingInboxProposals", groupIds],
    queryFn: () => {
      if (!userGroups?.length) {
        throw new Error("No groups.");
      }

      return getPendingInboxProposals({ groupId: groupIds });
    },
    enabled: !!userGroups?.length,
  });

  return { isLoading, proposals, error };
}
