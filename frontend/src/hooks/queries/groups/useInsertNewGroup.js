import { useMutation } from "@tanstack/react-query";
import { insertNewGroup as insertNewGroupApi } from "../../../services/apiGroups";

/**
 * Custom hook for inserting a new group
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertNewGroup - Function to insert a new group
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertNewGroup() {
  const { mutate: insertNewGroup, isLoading } = useMutation({
    /**
     * Mutation function to insert a new group
     * @param {Object} params - The parameters for inserting a group
     * @param {string} params.name - The name of the group to create
     * @returns {Promise} A promise that resolves when the group is inserted
     */
    mutationFn: ({ name }) => insertNewGroupApi({ name }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertNewGroup, isLoading };
}
