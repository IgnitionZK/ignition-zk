import { useMutation } from "@tanstack/react-query";
import { insertLeaf as insertLeafApi } from "../../../services/apiMerkleTreeLeaves";

export function useInsertLeaf() {
  const { mutate: insertLeaf, isLoading } = useMutation({
    mutationFn: ({ groupMemberId, commitment, groupId }) =>
      insertLeafApi({ groupMemberId, commitment, groupId }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertLeaf, isLoading };
}
