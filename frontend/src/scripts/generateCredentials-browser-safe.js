import * as bip39 from "bip39";
import * as circomlibjs from "circomlibjs";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { keccak256, toUtf8Bytes } from "ethers";
// import crypto from "crypto";

/**
 * A class for generating and managing zero-knowledge credentials.
 * This class provides methods for generating mnemonic seeds, cryptographic keys,
 * and zero-knowledge credentials for identity management.
 * It uses cryptographic primitives such as SHA-256, HKDF, and Poseidon hashing.
 */
export class ZkCredential {
  static #ENC = new TextEncoder();
  static #FIELD_PRIME =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  static #APP_SALT = ZkCredential.#ENC.encode("IgnitionZK_salt_v1");
  static #ZK_SECRET_INFO = ZkCredential.#ENC.encode("ZK_IDENTITY_SECRET");
  static #ZK_NULLIFIER_INFO = ZkCredential.#ENC.encode("ZK_IDENTITY_NULLIFIER");
  static #DERIVED_KEY_BYTE_LENGTH = 32;
  static #ENTROPY_BITS = 128;
  static #poseidonInstance;

  /**
   * Converts a byte array to a hexadecimal string.
   * @private
   * @param {Uint8Array} bytes - The byte array to convert
   * @returns {string} The hexadecimal representation of the bytes
   */
  static #bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Converts a string to a BigInt representation.
   * @private
   * @param {string} str - The string to convert
   * @returns {bigint} The BigInt representation of the string
   */
  static #stringToBigInt(str) {
    const encoder = new TextEncoder();
    const strEncoded = encoder.encode(str); // Uint8Array

    // Convert Uint8Array to a BigInt
    return BigInt(
      "0x" +
        Array.from(strEncoded)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
    );
  }

  /**
   * Converts a UUID string to a BigInt representation using Keccak-256.
   * @private
   * @param {string} uuid - The UUID string to convert
   * @returns {bigint} The BigInt representation of the UUID
   */
  static #uuidToBigInt(uuid) {
    return BigInt(keccak256(toUtf8Bytes(uuid)));
  }

  /**
   * Converts a tag string to a field element using SHA-256.
   * @private
   * @param {string} tag - The tag string to convert
   * @returns {Promise<bigint>} The field element representation of the tag
   */
  static async #tagToField(tag) {
    const data = ZkCredential.#ENC.encode(tag);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return BigInt("0x" + this.#bytesToHex(buf)) % this.#FIELD_PRIME;
  }

  /**
   * Performs modular reduction on a BigInt value to ensure it fits within the field.
   * @private
   * @param {bigint} rawBigInt - The BigInt value to reduce
   * @returns {bigint} The reduced value modulo FIELD_PRIME
   */
  static #performModularReduction(rawBigInt) {
    return (
      ((rawBigInt % this.#FIELD_PRIME) + this.#FIELD_PRIME) % this.#FIELD_PRIME
    );
  }

  /**
   * Gets or initializes the Poseidon hash instance.
   * @private
   * @returns {Promise<Object>} The Poseidon hash instance
   */
  static async #getPoseidon() {
    if (!this.#poseidonInstance) {
      this.#poseidonInstance = await circomlibjs.buildPoseidon();
    }
    return this.#poseidonInstance;
  }

  /**
   * Generates a mnemonic seed phrase and its corresponding seed.
   * @param {number} bits - The number of bits of entropy for the mnemonic, defaults to 128
   * @returns {Object} Object containing the seed and mnemonic phrase
   * @returns {Buffer} returns.seed - The generated seed buffer
   * @returns {string} returns.mnemonic - The mnemonic phrase
   * @throws {Error} If bits is less than 128
   */
  static generateMnemonicSeed(bits = this.#ENTROPY_BITS) {
    if (bits < 128) {
      throw new Error(
        "At least 128 bits of entropy are recommended for zk-identity use."
      );
    }

    // create mnemonic and seed
    const mnemonic = bip39.generateMnemonic(bits);
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    return { seed, mnemonic };
  }

  /**
   * Generates a seed from an existing mnemonic phrase.
   * @param {string} mnemonic - The mnemonic phrase to recover from
   * @returns {Buffer} The recovered seed buffer
   */
  static generateSeedFromMnemonic(mnemonic) {
    // Generate seed from mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    return seed;
  }

  /**
   * Generates trapdoor and nullifier keys from initial key material using HKDF.
   * @param {Uint8Array} ikm - The initial key material
   * @returns {Object} Object containing the trapdoor and nullifier keys
   * @returns {bigint} returns.trapdoorKey - The derived trapdoor key
   * @returns {bigint} returns.nullifierKey - The derived nullifier key
   */
  static generateKeys(ikm) {
    // ikm must be Uint8Array; if you have Buffer, do: new Uint8Array(ikm)
    const trapdoorBytes = hkdf(
      sha256,
      ikm,
      this.#APP_SALT,
      this.#ZK_SECRET_INFO,
      this.#DERIVED_KEY_BYTE_LENGTH
    );
    const nullifierBytes = hkdf(
      sha256,
      ikm,
      this.#APP_SALT,
      this.#ZK_NULLIFIER_INFO,
      this.#DERIVED_KEY_BYTE_LENGTH
    );

    const trapdoor = this.#performModularReduction(
      BigInt("0x" + this.#bytesToHex(trapdoorBytes))
    );
    const nullifier = this.#performModularReduction(
      BigInt("0x" + this.#bytesToHex(nullifierBytes))
    );
    return { trapdoorKey: trapdoor, nullifierKey: nullifier };
  }

  /**
   * Generates an identity using trapdoor and nullifier keys with Poseidon hashing.
   * @param {bigint} trapdoorKey - The trapdoor key for the identity
   * @param {bigint} nullifierKey - The nullifier key for the identity
   * @returns {Promise<Object>} Object containing the identity components
   * @returns {bigint} returns.trapdoor - The hashed trapdoor value
   * @returns {bigint} returns.nullifier - The hashed nullifier value
   * @returns {bigint} returns.commitment - The commitment hash
   */
  static async generateIdentity(trapdoorKey, nullifierKey) {
    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;

    const trapdoorTag = await this.#tagToField("zk-trapdoor");
    const nullifierTag = await this.#tagToField("zk-nullifier");

    const trapdoor = F.toObject(poseidon([trapdoorTag, trapdoorKey]));
    const nullifier = F.toObject(poseidon([nullifierTag, nullifierKey]));
    const commitment = F.toObject(poseidon([nullifier, trapdoor]));

    return { trapdoor, nullifier, commitment };
  }

  /**
   * Generates a public nullifier by combining identity nullifier with an external nullifier.
   * @param {bigint} identityNullifier - The identity nullifier value
   * @param {string} externalNullifier - The external nullifier string, typically a UUID
   * @returns {Promise<bigint>} The generated public nullifier
   * @throws {Error} If required parameters are missing
   * @throws {TypeError} If parameters have incorrect types
   */
  static async generatePublicNullifier(identityNullifier, externalNullifier) {
    if (!identityNullifier || !externalNullifier) {
      throw new Error(
        "Both identityNullifier and externalNullifier are required."
      );
    }

    if (typeof identityNullifier !== "bigint") {
      throw new TypeError("identityNullifier must be a bigint.");
    }
    if (typeof externalNullifier !== "string") {
      throw new TypeError("externalNullifier must be a string.");
    }

    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;

    const externalNullifierBigInt = this.#uuidToBigInt(externalNullifier);
    const publicNullifier = F.toObject(
      poseidon([identityNullifier, externalNullifierBigInt])
    );

    return publicNullifier;
  }

  /**
   * Generates complete zero-knowledge credentials including identity and commitment.
   * @param {number} bits - The number of bits of entropy for the mnemonic, defaults to 128
   * @returns {Promise<Object>} Object containing the complete credentials
   * @returns {Object} returns.identity - The identity object
   * @returns {bigint} returns.identity.trapdoor - The trapdoor value
   * @returns {bigint} returns.identity.nullifier - The nullifier value
   * @returns {bigint} returns.commitment - The commitment hash
   * @returns {string} returns.mnemonic - The mnemonic phrase
   */
  static async generateCredentials(bits = this.#ENTROPY_BITS) {
    const { seed, mnemonic } = this.generateMnemonicSeed(bits);
    const { trapdoorKey, nullifierKey } = this.generateKeys(seed);
    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;

    const trapdoorTag = await this.#tagToField("zk-trapdoor");
    const nullifierTag = await this.#tagToField("zk-nullifier");

    const trapdoor = F.toObject(poseidon([trapdoorTag, trapdoorKey]));
    const nullifier = F.toObject(poseidon([nullifierTag, nullifierKey]));
    const commitment = F.toObject(poseidon([nullifier, trapdoor]));

    return { identity: { trapdoor, nullifier }, commitment, mnemonic };
  }
}
