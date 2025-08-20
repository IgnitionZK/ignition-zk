import { useQuery } from "@tanstack/react-query";
import { checkCommitmentExists } from "../../../services/apiGroupMembers";

/**
 * Hook to check if a commitment exists for a group member in the merkle tree.
 *
 * This hook queries the database to determine whether a specific group member
 * has an active commitment stored in the merkle tree leaves. It's typically used
 * to verify if a user has completed the membership verification process for a group.
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
