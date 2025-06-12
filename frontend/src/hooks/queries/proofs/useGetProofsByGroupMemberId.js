import { useQuery } from "@tanstack/react-query";
import { getProofsByGroupMemberId } from "../../../services/apiProofs";

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
