import { useQuery } from "@tanstack/react-query";
import { checkCommitmentExists } from "../../../services/apiGroupMembers";

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
