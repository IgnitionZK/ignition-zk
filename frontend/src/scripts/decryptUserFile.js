// src/decrypt.js
import {
  LitNodeClient,
  stringToUint8Array,
  decryptFile,
} from '@lit-protocol/lit-node-client';

export const decryptPdf = async ({
  encryptedFile,
  encryptedSymmetricKey,
  accessControlConditions,
  userAddress,
  chain = 'sepolia',
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

  const decryptedBlob = await decryptFile({ file: encryptedFile, symmetricKey });
  return decryptedBlob;
};
