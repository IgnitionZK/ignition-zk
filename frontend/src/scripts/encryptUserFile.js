import {
  LitNodeClient,
  uint8arrayToString,
  checkAndSignAuthMessage,
} from "@lit-protocol/lit-node-client";
import { encryptFile } from "@lit-protocol/sdk-browser";

/**
 * Encrypts a user file using Lit Protocol with ERC721 NFT-based access control
 *
 * This function performs a two-step encryption process:
 * 1. Encrypts the file using symmetric encryption
 * 2. Encrypts the symmetric key using asymmetric encryption with access control
 *
 * Access control is based on ERC721 NFT ownership where users must own at least
 * one NFT from the specified contract to decrypt the file
 *
 * @async
 * @function encryptUserFile
 * @param {File} file - The file to be encrypted
 * @param {string} chain - The blockchain network identifier e.g., 'ethereum', 'polygon'
 * @param {string} nftAddress - The ERC721 contract address for access control
 * @param {string} userAddress - The user's wallet address for authentication
 * @returns {Promise<Object>} Object containing encrypted file data and access control
 * @returns {Uint8Array} returns.encryptedFile - The encrypted file as a byte array
 * @returns {string} returns.encryptedSymmetricKey - The encrypted symmetric key in base16 format
 * @returns {Array} returns.accessControlConditions - The access control conditions for decryption
 *
 * @throws {Error} When Lit Node client connection fails
 * @throws {Error} When authentication signature generation fails
 * @throws {Error} When file encryption fails
 * @throws {Error} When symmetric key encryption fails
 */
export const encryptUserFile = async (file, chain, nftAddress, userAddress) => {
  // Initialize Lit Protocol node client for test network
  const litNodeClient = new LitNodeClient({
    litNetwork: "datil-test",
  });

  // Connect to Lit Protocol network
  await litNodeClient.connect();

  // Generate authentication signature for the user on the specified chain
  const authSig = await checkAndSignAuthMessage({ chain });

  // Define access control conditions based on ERC721 NFT ownership
  // Users must own at least one NFT from the specified contract to access the file
  const accessControlConditions = [
    {
      contractAddress: nftAddress,
      standardContractType: "ERC721",
      chain: chain,
      method: "balanceOf",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: ">",
        value: "0",
      },
    },
  ];

  // Step 1: Encrypt the file using symmetric encryption
  // This generates an encrypted file and a symmetric key
  const { encryptedFile, symmetricKey } = await encryptFile({ file });

  // Step 2: Encrypt the symmetric key using asymmetric encryption with access control
  // The symmetric key is encrypted and can only be decrypted by users meeting the access conditions
  const encryptedSymmetricKey = await litNodeClient.saveEncryptionKey({
    accessControlConditions,
    symmetricKey,
    authSig,
    chain,
  });

  // Return the encrypted file data and access control information
  return {
    encryptedFile,
    encryptedSymmetricKey: uint8arrayToString(encryptedSymmetricKey, "base16"),
    accessControlConditions,
  };
};
