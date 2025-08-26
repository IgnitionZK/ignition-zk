import { useMutation } from "@tanstack/react-query";
import { updateTreasuryAddress as updateTreasuryAddressApi } from "../../../services/apiGroups";

/**
 * Custom hook for updating the treasury address for a group.
 * This hook provides a mutation function to associate a treasury contract address
 * with a specific group in the proposals table, along with loading state management.
 */
export function useUpdateTreasuryAddress() {
  const { mutate: updateTreasuryAddress, isLoading } = useMutation({
    mutationFn: ({ group_id, treasury_address }) =>
      updateTreasuryAddressApi({ group_id, treasury_address }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { updateTreasuryAddress, isLoading };
}
