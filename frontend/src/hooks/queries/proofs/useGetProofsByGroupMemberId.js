import { useQuery } from "@tanstack/react-query";
import { getProofsByGroupMemberId } from "../../../services/apiProofs";

/**
 * Custom hook to fetch proofs associated with a specific group member.
 *
 * @param {string} groupMemberId - The unique identifier of the group member
 * @returns {Object} An object containing:
 *   @property {boolean} isLoading - Indicates if the query is currently loading
 *   @property {Array} proofs - The array of proofs associated with the group member
 *   @property {Error|null} error - Any error that occurred during the query
 *
 * @example
 * const { isLoading, proofs, error } = useGetProofsByGroupMemberId("member123");
 */
export function useGetProofsByGroupMemberId(groupMemberId) {
  const {
    isLoading,
    data: proofs,
    error,
  } = useQuery({
    queryKey: ["proofs", "groupMemberId", groupMemberId],
    queryFn: () => {
      if (!groupMemberId) {
        throw new Error("No group member ID provided.");
      }

      return getProofsByGroupMemberId(groupMemberId);
    },
    enabled: !!groupMemberId,
  });

  return { isLoading, proofs, error };
}
