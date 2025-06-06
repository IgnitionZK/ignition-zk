import { useQuery } from "@tanstack/react-query";
import { checkCommitmentExists } from "../../../services/apiGroupMembers";

/**
 * Hook to check if a commitment exists for a group member
 *
 * @param {Object} params - The parameters object
 * @param {string} params.groupMemberId - The ID of the group member to check commitment for
 *
 * @returns {Object} Object containing:
 *   - isLoading: boolean indicating if the query is in progress
 *   - hasCommitment: boolean indicating if the commitment exists
 *   - error: any error that occurred during the query
 *
 * @note Query Details:
 * - queryKey: ["hasCommitment", groupMemberId] - Unique key for caching and invalidation
 * - queryFn: Calls checkCommitmentExists API with the groupMemberId
 * - enabled: Query only runs when groupMemberId is provided
 */
export function useCheckCommitment({ groupMemberId }) {
  const {
    isLoading,
    data: hasCommitment,
    error,
  } = useQuery({
    queryKey: ["hasCommitment", groupMemberId],
    queryFn: () => checkCommitmentExists({ groupMemberId }),
    enabled: !!groupMemberId,
  });

  return { isLoading, hasCommitment, error };
}
