import { useQuery } from "@tanstack/react-query";
import { getProofsByGroupIds } from "../../../services/apiProofs";

/**
 * Custom hook to fetch proofs associated with specific group IDs and group member IDs using the Supabase RPC function.
 * @param {string[]} groupIds - Array of group IDs
 * @param {string[]} groupMemberIds - Array of group member IDs (one-to-one mapping with groupIds)
 * @returns {Object} Object containing loading state, proofs data, error, and refetch function
 */
export function useGetProofsByGroupIds(groupIds, groupMemberIds) {
  const {
    isLoading,
    data: proofs,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "proofs",
      "groupIds",
      groupIds,
      "groupMemberIds",
      groupMemberIds,
    ],
    queryFn: () => {
      if (!groupIds || !Array.isArray(groupIds)) {
        throw new Error("No group IDs array provided.");
      }

      if (!groupMemberIds || !Array.isArray(groupMemberIds)) {
        throw new Error("No group member IDs array provided.");
      }

      if (groupIds.length !== groupMemberIds.length) {
        throw new Error(
          "Group IDs and group member IDs arrays must have the same length."
        );
      }

      return getProofsByGroupIds(groupIds, groupMemberIds);
    },
    enabled:
      !!groupIds &&
      !!groupMemberIds &&
      Array.isArray(groupIds) &&
      Array.isArray(groupMemberIds) &&
      groupIds.length > 0 &&
      groupIds.length === groupMemberIds.length,
  });

  return { isLoading, proofs, error, refetch };
}
