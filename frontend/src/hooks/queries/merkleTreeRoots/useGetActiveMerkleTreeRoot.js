import { useQuery } from "@tanstack/react-query";
import { getActiveMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";

/**
 * Custom hook to fetch the active Merkle tree root for a specific group.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to fetch the active Merkle tree root for
 * @returns {Object} An object containing:
 *   @property {Object} data - The active Merkle tree root data
 *   @property {boolean} isLoading - Loading state indicator
 *   @property {Error|null} error - Error object if the query failed, null otherwise
 */
export function useGetActiveMerkleTreeRoot({ groupId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["merkleTreeRoot", "active", groupId],
    queryFn: () => getActiveMerkleTreeRoot({ groupId }),
    enabled: !!groupId,
  });

  return { data, isLoading, error };
}
