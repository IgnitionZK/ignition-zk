import { useMutation } from "@tanstack/react-query";
import { insertLeaf as insertLeafApi } from "../../../services/apiMerkleTreeLeaves";

/**
 * Custom hook for inserting a leaf into the Merkle tree
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertLeaf - Function to insert a leaf into the Merkle tree
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertLeaf() {
  const { mutate, isLoading } = useMutation({
    /**
     * Mutation function to insert a leaf into the Merkle tree
     * @param {Object} params - The parameters for inserting a leaf
     * @param {string} params.groupMemberId - The ID of the group member
     * @param {string} params.commitment - The commitment value to be inserted
     * @param {string} params.groupId - The ID of the group
     * @returns {Promise} A promise that resolves when the leaf is inserted
     */
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
