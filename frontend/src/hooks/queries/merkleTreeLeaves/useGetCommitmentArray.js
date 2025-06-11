import { useQuery } from "@tanstack/react-query";
import { getCommitmentArray } from "../../../services/apiMerkleTreeLeaves";

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
