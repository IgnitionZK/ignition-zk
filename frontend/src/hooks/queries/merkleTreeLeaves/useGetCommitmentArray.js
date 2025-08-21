import { useQuery } from "@tanstack/react-query";
import { getCommitmentArray } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to fetch and manage commitment array data for a specific group.
 * Retrieves commitment values from the merkle tree leaves and converts them to BigInt format.
 * The hook automatically handles loading states, error handling, and data transformation.
 */
export function useGetCommitmentArray({ groupId }) {
  const {
    isLoading,
    data: commitmentArray,
    error,
  } = useQuery({
    queryKey: ["commitmentArray", groupId],
    queryFn: async () => {
      if (!groupId) {
        throw new Error("No group ID provided.");
      }
      const data = await getCommitmentArray({ groupId });
      return data.map((item) => BigInt(item.commitment_value));
    },
    enabled: !!groupId,
  });

  return { isLoading, commitmentArray, error };
}
