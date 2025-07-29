const circomlibjs = require("circomlibjs");
const { keccak256, toUtf8Bytes, toBeHex } = require("ethers");

class Conversions {
  // Field modulus for the ZK circuits
  static FIELD_MODULUS = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  // Poseidon instance for hashing
  static #poseidonInstance;

  static async #getPoseidon() {
    if (!this.#poseidonInstance) {
      this.#poseidonInstance = await circomlibjs.buildPoseidon();
    }
    return this.#poseidonInstance;
  }

  /**
   * Converts a string to a BigInt representation.
   * This method hashes the string using keccak256 and reduces it modulo the field modulus.
   * @param {string} str - The string to convert.
   * @returns {bigint} The BigInt representation of the string.
   */
  static stringToBigInt(str) {
    const hash = BigInt(keccak256(toUtf8Bytes(str)));
    return hash % this.FIELD_MODULUS;
  }

  static stringToBytes32(str) {
    const hash = BigInt(keccak256(toUtf8Bytes(str)));
    const reduced = hash % this.FIELD_MODULUS;
    return toBeHex(reduced, 32); // Return as a 32-byte hex string
  }

  /**
   * Computes the context key using Poseidon hash from groupKey and epochKey.
   * This is used for proposal verification to create the context hash.
   * @param {string} groupKey - The group key string.
   * @param {string} epochKey - The epoch key string.
   * @returns {Promise<string>} The computed context key as a hex string.
   */
  static async computeContextKey(groupKey, epochKey) {
    const groupHashBigInt = this.stringToBigInt(groupKey);
    const epochHashBigInt = this.stringToBigInt(epochKey);

    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;
    const contextHashBigInt = F.toObject(
      poseidon([groupHashBigInt, epochHashBigInt])
    );

    // Convert to hex string for better compatibility with ethers.js
    return toBeHex(contextHashBigInt);
  }


  /**
   * Computes the context key using Poseidon hash from groupKey and epochKey.
   * This is used for proposal verification to create the context hash.
   * @param {string} groupId - The group key string.
   * @param {string} epochId - The epoch key string.
   * @param {string} proposalId - The proposal key string.
   * @returns {Promise<string>} The computed context key as a hex string.
   */
  static async computeVoteContextKey(groupId, epochId, proposalId) {
    const groupHashBigInt = this.stringToBigInt(groupId);
    const epochHashBigInt = this.stringToBigInt(epochId);
    const proposalHashBigInt = this.stringToBigInt(proposalId);

    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;
    const contextHashBigInt = F.toObject(
      poseidon([groupHashBigInt, epochHashBigInt, proposalHashBigInt])
    );

    // Convert to hex string for better compatibility with ethers.js
    return toBeHex(contextHashBigInt);
  }
}

module.exports = { Conversions };
