import { useQuery } from "@tanstack/react-query";
import { getEpochsByGroupId } from "../../../services/apiEpochs";

/**
 * Custom hook to fetch epochs by group ID.
 * Returns all epochs associated with a specific group, ordered by start time.
 * The hook automatically enables/disables based on whether a groupId is provided.
 */
export function useGetEpochsByGroupId(groupId) {
  const {
    isLoading,
    data: epochs,
    error,
  } = useQuery({
    queryKey: ["epochsByGroupId", groupId],
    queryFn: () => getEpochsByGroupId(groupId),
    enabled: !!groupId,
  });

  return { isLoading, epochs, error };
}
