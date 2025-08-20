/**
 * @fileoverview File decryption utility using Lit Protocol for secure file access
 */
import {
  LitNodeClient,
  stringToUint8Array,
  decryptFile,
} from "@lit-protocol/lit-node-client";

/**
 * Decrypts an encrypted PDF file using Lit Protocol's access control system
 *
 * @param {Object} params - The decryption parameters
 * @param {Blob|File} params.encryptedFile - The encrypted file to decrypt
 * @param {string} params.encryptedSymmetricKey - The encrypted symmetric key for file decryption
 * @param {Array} params.accessControlConditions - Access control conditions that must be met for decryption
 * @param {string} params.userAddress - The user's wallet address for authentication
 * @param {string} [params.chain='sepolia'] - The blockchain network to use for authentication
 * @returns {Promise<Blob>} A promise that resolves to the decrypted file as a Blob
 * @throws {Error} Throws an error if decryption fails or authentication is unsuccessful
 */
export const decryptPdf = async ({
  encryptedFile,
  encryptedSymmetricKey,
  accessControlConditions,
  userAddress,
  chain = "sepolia",
}) => {
  const litNodeClient = new LitNodeClient();
  await litNodeClient.connect();

  const authSig = await LitNodeClient.checkAndSignAuthMessage({ chain });

  const symmetricKey = await litNodeClient.getEncryptionKey({
    accessControlConditions,
    toDecrypt: encryptedSymmetricKey,
    chain,
    authSig,
  });

  const decryptedBlob = await decryptFile({
    file: encryptedFile,
    symmetricKey,
  });
  return decryptedBlob;
};
