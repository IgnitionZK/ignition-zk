import { useQuery } from "@tanstack/react-query";
import { getProposalsByGroupId } from "../../../services/apiProposals";

export function useGetProposalsByGroupId(userGroups) {
  const groupIds = userGroups?.map((group) => group.group_id) || [];

  const {
    isLoading,
    data: proposals,
    error,
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

  return { isLoading, proposals, error };
}
