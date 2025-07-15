import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEpochByUserId } from "../../../services/apiEpochs";

/**
 * Custom hook to fetch epochs for the current user
 *
 * @returns {Object} An object containing:
 *   - isLoading: boolean - Loading state of the query
 *   - epochs: Array - List of epochs the user is a member of
 *   - error: Error | null - Error state of the query
 *
 * @notes
 * - queryKey ["epochs", userId] - Query key includes:
 *   - "epochs": Base key for epochs data
 *   - userId: User ID to fetch epochs for
 *
 * - queryFn
 *   - Fetches epochs using getEpochByUserId API call
 *   - Requires valid user ID from queryClient
 *   - Throws error if no user ID is available
 *   - Only enabled when user ID exists
 */
export function useGetEpochByUserId() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(["user"]);

  const {
    isLoading,
    data: epochs,
    error,
  } = useQuery({
    queryKey: ["epochs", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("No user ID available");
      }
      return getEpochByUserId(user.id);
    },
    enabled: !!user?.id,
  });

  return { isLoading, epochs, error };
}
