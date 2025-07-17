import { LitNodeClient, uint8arrayToString, checkAndSignAuthMessage } from '@lit-protocol/lit-node-client';
import { encryptFile } from '@lit-protocol/sdk-browser';

export const encryptUserFile = async (file, chain, nftAddress, userAddress) => {
  const litNodeClient = new LitNodeClient({
    litNetwork: "datil-test"
  });

  await litNodeClient.connect();

  const authSig = await checkAndSignAuthMessage({ chain});

  const accessControlConditions = [
    {
      contractAddress: nftAddress,
      standardContractType: 'ERC721',
      chain: chain,
      method: 'balanceOf',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '>',
        value: '0',
      },
    },
  ];

  // Encrypt the PDF
  const { encryptedFile, symmetricKey } = await encryptFile({ file });

  // Encrypt symmetric key with asymmetric encryption:
  const encryptedSymmetricKey = await litNodeClient.saveEncryptionKey({
    accessControlConditions,
    symmetricKey,
    authSig,
    chain,
  });

  return {
    encryptedFile,
    encryptedSymmetricKey: uint8arrayToString(encryptedSymmetricKey, 'base16'),
    accessControlConditions,
  };
};
