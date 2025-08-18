import { useQuery } from "@tanstack/react-query";
import { getProposalsByGroupId } from "../../../services/apiProposals";

/**
 * Custom hook to fetch active proposals for a list of user groups
 * @param {Array<{group_id: string}>} userGroups - Array of user group objects containing group_id
 * @returns {Object} Object containing loading state, proposals data, and error state
 * @property {boolean} isLoading - Loading state of the query
 * @property {Array} proposals - Array of proposals data
 * @property {Error} error - Error object if query fails
 */
export function useGetProposalsByGroupId(userGroups) {
  const groupIds = userGroups?.map((group) => group.group_id) || [];

  const {
    isLoading,
    data: proposals,
    error,
    refetch,
  } = useQuery({
    queryKey: ["proposals", groupIds],
    queryFn: () => {
      if (!userGroups?.length) {
        throw new Error("No groups.");
      }

      return getProposalsByGroupId({ groupId: groupIds });
    },
    enabled: !!userGroups?.length,
  });

  return { isLoading, proposals, error, refetch };
}
