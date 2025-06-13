import { useQuery } from "@tanstack/react-query";
import { getCommitmentArray } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook to fetch and manage commitment array data for a specific group
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to fetch commitments for
 * @returns {Object} An object containing:
 *   @property {boolean} isLoading - Whether the data is currently loading
 *   @property {BigInt[]|undefined} commitmentArray - Array of commitment values as BigInt
 *   @property {Error|null} error - Any error that occurred during the fetch
 * @throws {Error} If no groupId is provided
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
