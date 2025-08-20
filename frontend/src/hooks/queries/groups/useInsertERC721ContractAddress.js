import { useMutation } from "@tanstack/react-query";
import { insertERC721ContractAddress as insertERC721ContractAddressApi } from "../../../services/apiGroups";

/**
 * Custom hook for inserting an ERC721 contract address for a group.
 * This hook provides a mutation function to associate an ERC721 contract address
 * with a specific group, along with loading state management.
 */
export function useInsertERC721ContractAddress() {
  const { mutate: insertERC721ContractAddress, isLoading } = useMutation({
    mutationFn: ({ group_id, erc721_contract_address }) =>
      insertERC721ContractAddressApi({ group_id, erc721_contract_address }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertERC721ContractAddress, isLoading };
}
