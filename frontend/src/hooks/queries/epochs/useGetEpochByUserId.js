import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEpochByUserId } from "../../../services/apiEpochs";

/**
 * Custom hook to fetch epochs for the current user
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
