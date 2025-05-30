import { useMutation } from "@tanstack/react-query";
import { insertLeaf as insertLeafApi } from "../../../services/apiMerkleTreeLeaves";

export function useInsertLeaf() {
  const { mutate: insertLeaf, isLoading } = useMutation({
    mutationFn: ({ groupMemberId, commitment }) =>
      insertLeafApi({ groupMemberId, commitment }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertLeaf, isLoading };
}
