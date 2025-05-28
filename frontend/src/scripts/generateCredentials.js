// // These credentials are intended for use in zero-knowledge identity systems
// // Poseidon inputs are domain-separated to prevent collisions across identity layers

// // imports
// import "dotenv/config";
// import * as bip39 from "bip39";
// import * as circomlibjs from "circomlibjs";
// import hkdf from "futoin-hkdf";
// import { ethers } from "ethers";

// /**
//  * @title ZkIdentity
//  * @notice A class for generating and managing zero-knowledge identity credentials
//  * @dev Uses BIP39 for mnemonic generation, HKDF for key derivation, and Poseidon for hashing
//  */
// export class ZkCredential {
//   /**
//    * Configuration of class-level state variables.
//    * @param {BigInt} FIELD_PRIME - the field prime of the BN254 elliptic curve.
//    * Used to perform a modular reduction of the HKDF output to ensure it is within the BN254 finite field.
//    * @param {Buffer} APP_SALT - application-specific salt used within the HDKF derivation process.
//    * Ensures that the keys are unique, even with identical input key material across different contexts.
//    * @param {Buffer} ZK_SECRET_INFO - contextual information string used during HKDF to derive the unique secret key.
//    * It provides domain separation.
//    * @param {Buffer} ZK_NULLIFIER_INFO - contextual information string used during HKDF to derive the unique nullifier key.
//    * It ensures independence from the identity secret.
//    * @param {number} DERIVED_KEY_BYTE_LENGTH - the desired byte length of the zk secret keys computed with HKDF (eg., 32 for 256-bit keys).
//    * @param {number} ENTROPY_BITS - the number of entropy bits used for the generation of the BIP39 mnemonic phrase.
//    */

//   static #FIELD_PRIME =
//     21888242871839275222246405745257275088548364400416034343698204186575808495617n;
//   static #APP_SALT = Buffer.from("IgnitionZK_salt_v1");
//   static #ZK_SECRET_INFO = Buffer.from("ZK_IDENTITY_SECRET");
//   static #ZK_NULLIFIER_INFO = Buffer.from("ZK_IDENTITY_NULLIFIER");
//   static #DERIVED_KEY_BYTE_LENGTH = 32;
//   static #ENTROPY_BITS = 128;
//   static #poseidonInstance;

//   /**
//    * @title Convert Tag to Field Element
//    * @notice Converts a string tag into a field element for use in Poseidon hashing
//    * @dev Uses SHA-256 to hash the tag and reduces it modulo the field prime
//    * @param {string} tag - The string tag to convert (e.g., "zk-trapdoor", "zk-nullifier")
//    * @return {bigint} The tag converted to a field element in BN254's finite field
//    * @private
//    */
//   static #tagToField(tag) {
//     const hash = crypto.createHash("sha256").update(tag).digest("hex");
//     return BigInt("0x" + hash) % this.#FIELD_PRIME;
//   }

//   /**
//    * @title Perform modular reduction
//    * @notice Reduces a BigInt value to the finite field of the BN254 elliptic curve (within [0, P-1])
//    * @param {BigInt} rawBigInt - The BigInt to convert
//    * @return {bigint} The BigInt value converted to a field element in BN254's finite field
//    * @private
//    */
//   static #performModularReduction(rawBigInt) {
//     return (
//       ((rawBigInt % this.#FIELD_PRIME) + this.#FIELD_PRIME) % this.#FIELD_PRIME
//     );
//   }

//   /**
//    * @title Get Poseidon Instance
//    * @notice Returns a singleton instance of the Poseidon hash function
//    * @dev Uses memoization to cache the Poseidon instance for better performance
//    * @return {Promise<Object>} The Poseidon hash function instance with its field operations
//    * @private
//    */
//   static async #getPoseidon() {
//     if (!this.#poseidonInstance) {
//       this.#poseidonInstance = await circomlibjs.buildPoseidon();
//     }
//     return this.#poseidonInstance;
//   }

//   /**
//    * @title Verify if address is a member
//    * @notice Checks if a given address is an eligible or valid member of the DAO.
//    * @dev Address has to be the owner of an ERC721 token to be a member.
//    * @param {string} address - The wallet address whose ERC721 token balance we want to check
//    * @param {ethers.Contract} contract - ERC721 contract instance
//    * @returns {boolean} - Boolean indicating whether the wallet address holds the ERC721 token
//    * If true, the address is an eligible member of the DAO.
//    * @private
//    */
//   static async #isMember(contract, address) {
//     const balance = await contract.balanceOf(address);
//     return balance > BigInt(0);
//   }

//   /**
//    * @notice Checks if a given address is an eligible or valid member of the DAO based on ERC721 ownership.
//    * @dev Address has to be the owner of an ERC721 token to be a member.
//    * Throws an error if the user is not a member or if the check fails.
//    * @param {string} tokenAddress - The ERC721 contract address.
//    * @param {string} privateKey - The private key of the wallet to check. (CAUTION: Not for production frontend)
//    * @param {string} alchemyUrl - The Alchemy RPC URL.
//    * @returns {Promise<boolean>} Resolves to true if the user is a member, throws an error otherwise.
//    * @private
//    */
//   static async #applyERC721Gating(tokenAddress, privateKey, alchemyUrl) {
//     if (tokenAddress && privateKey && alchemyUrl) {
//       try {
//         const ABI = [
//           "function balanceOf(address owner) view returns (uint256)",
//         ];
//         const provider = new ethers.JsonRpcProvider(alchemyUrl);
//         const wallet = new ethers.Wallet(privateKey, provider);
//         const contract = new ethers.Contract(tokenAddress, ABI, provider);

//         const isValidMember = await this.#isMember(contract, wallet.address);
//         console.log(
//           `The user with address ${wallet.address} is a current member (owns ERC721 token):`,
//           isValidMember
//         );

//         // if not a valid member, terminate with an error
//         if (!isValidMember) {
//           const errorMsg = `The user with address ${wallet.address} is not an owner of the ERC721 token and is therefore not a valid member.`;
//           throw new Error(errorMsg);
//         }

//         return true;
//       } catch (error) {
//         console.error("There was an error during the ERC721 check:", error);
//         throw new Error(`ERC721 membership check failed: ${error.message}`);
//       }
//     } else {
//       throw new Error(
//         "ERC721_ADDRESS, PRIVATE_KEY or URL not properly set. ERC721 check cannot be performed."
//       );
//     }
//   }

//   /**
//    * @title Generate Mnemonic Seed
//    * @notice Generates a cryptographically secure seed value from a BIP39 mnemonic phrase
//    * @dev Produces a secure 512-bit seed by combining the BIP39 mnemonic phrase with a secret (optional) passphrase,
//    *  and then reduces it to BN254's finite field. The 512-bit seed is suitable for deterministic key derivation.
//    * @param {number} bits - The number of bits of entropy for mnemonic generation (default: 128, i.e., 12 words)
//    * @return {{ seed: Buffer, mnemonic: string }} The generated seed value reduced to BN254's finite field
//    * @throws {Error} If bits is less than 128
//    */
//   static generateMnemonicSeed(bits = this.#ENTROPY_BITS) {
//     if (bits < 128) {
//       throw new Error(
//         "At least 128 bits of entropy are recommended for zk-identity use."
//       );
//     }

//     // create mnemonic and seed
//     const mnemonic = bip39.generateMnemonic(bits);
//     const seed = bip39.mnemonicToSeedSync(mnemonic);

//     return { seed, mnemonic };
//   }

//   /**
//    * @notice Generates the deterministic ZK (identity) secret keys: zkIdentityTrapdoor and zkIdentityNullifier.
//    * @dev The secret keys are derived from the Input Key Material (IKM) using HKDF (HMAC-based Key Derivation Function) and the futoin-hdkf package.
//    * The derived secret keys are then converted to BigInts to be suitable as inputs to the Poseidon hash function.
//    * @param {Buffer} ikm - IKM (Input Key Material): usually the cryptographic seed derived key from the mnemonic phrase.
//    * @returns {{zkIdentitySecret: bigint, zkIdentityNullifier: bigint}} - An object containing the two derived ZK secret keys.
//    */
//   static generateKeys(ikm) {
//     // Securely slice and copy
//     const trapdoorKeyRaw = hkdf(ikm, this.#DERIVED_KEY_BYTE_LENGTH, {
//       salt: this.#APP_SALT,
//       info: this.#ZK_SECRET_INFO,
//       hash: "sha256",
//     });

//     const nullifierKeyRaw = hkdf(ikm, this.#DERIVED_KEY_BYTE_LENGTH, {
//       salt: this.#APP_SALT,
//       info: this.#ZK_NULLIFIER_INFO,
//       hash: "sha256",
//     });

//     // Convert the keys to BigInt and reduce into the finite field of BN254
//     const trapdoorKey = this.#performModularReduction(
//       BigInt("0x" + trapdoorKeyRaw.toString("hex"))
//     );
//     const nullifierKey = this.#performModularReduction(
//       BigInt("0x" + nullifierKeyRaw.toString("hex"))
//     );

//     return { trapdoorKey, nullifierKey };
//   }

//   /**
//    * @title Generate Credentials
//    * @notice Generates complete credentials with trapdoor, nullifier, and commitment from a new mnemonic seed
//    * @dev Uses Poseidon hash function from circomlibjs to generate cryptographically secure identity components
//    * @param {number} [bits=128] - The number of bits of entropy for mnemonic generation
//    * @return {Promise<Object>} Object containing:
//    *   - identity: Object containing identity trapdoor and nullifier
//    *   - commitment: The final commitment hash of nullifier and trapdoor
//    *   - mnemonic: The BIP39 mnemonic phrase used to generate the credentials
//    * @throws {Error} If bits is less than 256
//    */
//   static async generateCredentials(bits = this.#ENTROPY_BITS) {
//     const { seed, mnemonic } = this.generateMnemonicSeed(bits);

//     const { trapdoorKey, nullifierKey } = this.generateKeys(seed);

//     const poseidon = await this.#getPoseidon();
//     const F = poseidon.F;

//     // using hashed tags (like "zk-trapdoor", "zk-nullifier") provides another layer of semantic separation that's harder to mix up or collide
//     const trapdoorTag = this.#tagToField("zk-trapdoor");
//     const nullifierTag = this.#tagToField("zk-nullifier");

//     const trapdoor = F.toObject(poseidon([trapdoorTag, trapdoorKey]));
//     const nullifier = F.toObject(poseidon([nullifierTag, nullifierKey]));
//     const commitment = F.toObject(poseidon([nullifier, trapdoor]));

//     return {
//       identity: {
//         trapdoor,
//         nullifier,
//       },
//       commitment,
//       mnemonic,
//     };
//   }
// }

// // Example usage
// (async () => {
//   const { identity, commitment, mnemonic } =
//     await ZkCredential.generateCredentials(128);
//   console.log({ identity, commitment, mnemonic });
// })();
