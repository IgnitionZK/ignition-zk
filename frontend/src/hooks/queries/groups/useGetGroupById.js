import { useQuery } from "@tanstack/react-query";
import { getGroupById } from "../../../services/apiGroups";

/**
 * Custom hook for fetching a group by its ID including treasury_address.
 * This hook provides the group data along with loading and error states.
 */
export function useGetGroupById({ groupId, enabled = true }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById({ groupId }),
    enabled: enabled && !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    group: data,
    isLoading,
    error,
    refetch,
  };
}
