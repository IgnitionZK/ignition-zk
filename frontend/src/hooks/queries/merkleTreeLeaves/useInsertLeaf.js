import { useMutation } from "@tanstack/react-query";
import { insertLeaf as insertLeafApi } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook for inserting a leaf into the Merkle tree.
 * Provides a mutation function to add new commitments to the tree
 * and returns loading state for UI feedback.
 */
export function useInsertLeaf() {
  const { mutate, isLoading } = useMutation({
    mutationFn: ({ groupMemberId, commitment, groupId }) =>
      insertLeafApi({ groupMemberId, commitment, groupId }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  const insertLeaf = (params) => {
    return new Promise((resolve, reject) => {
      mutate(params, {
        onSuccess: (data) => {
          resolve(data);
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return { insertLeaf, isLoading };
}
