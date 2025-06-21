import { useMutation } from "@tanstack/react-query";
import { insertERC721ContractAddress as insertERC721ContractAddressApi } from "../../../services/apiGroups";

/**
 * Custom hook for inserting an ERC721 contract address for a group
 * @returns {Object} An object containing the mutation function and loading state
 * @property {Function} insertERC721ContractAddress - Function to insert an ERC721 contract address
 * @property {boolean} isLoading - Boolean indicating if the mutation is in progress
 */
export function useInsertERC721ContractAddress() {
  const { mutate: insertERC721ContractAddress, isLoading } = useMutation({
    /**
     * Mutation function to insert an ERC721 contract address for a group
     * @param {Object} params - The parameters for inserting an ERC721 contract address
     * @param {number|string} params.group_id - The ID of the group to update
     * @param {string} params.erc721_contract_address - The Ethereum address of the ERC721 contract
     * @returns {Promise} A promise that resolves when the contract address is inserted
     */
    mutationFn: ({ group_id, erc721_contract_address }) =>
      insertERC721ContractAddressApi({ group_id, erc721_contract_address }),
    onError: (err) => {
      console.log("ERROR", err);
    },
  });

  return { insertERC721ContractAddress, isLoading };
}
