import { useQuery } from "@tanstack/react-query";
import { getActiveMerkleTreeRoot } from "../../../services/apiMerkleTreeRoots";

export function useGetActiveMerkleTreeRoot({ groupId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["merkleTreeRoot", "active", groupId],
    queryFn: () => getActiveMerkleTreeRoot({ groupId }),
    enabled: !!groupId,
  });

  return { data, isLoading, error };
}
