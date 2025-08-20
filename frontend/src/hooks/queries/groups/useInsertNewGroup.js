import { useMutation } from "@tanstack/react-query";
import { insertNewGroup as insertNewGroupApi } from "../../../services/apiGroups";

/**
 * Custom hook for inserting a new group into the system.
 *
 * This hook provides a mutation function to create new groups and tracks the loading state.
 * It handles the API call to insert a new group and provides error handling.

 */
export function useInsertNewGroup() {
  const { mutate: insertNewGroup, isLoading } = useMutation({
    mutationFn: ({ name }) => insertNewGroupApi({ name }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertNewGroup, isLoading };
}
