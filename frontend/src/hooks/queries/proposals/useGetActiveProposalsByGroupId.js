import { useQuery } from "@tanstack/react-query";
import { getProposalsByGroupId } from "../../../services/apiProposals";

/**
 * Custom hook to fetch active proposals for a list of user groups
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
