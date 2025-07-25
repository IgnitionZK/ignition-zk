import { plonk } from "snarkjs";
import { ZkCredential } from "../generateCredentials-browser-safe.js";
import { MerkleTreeService } from "../merkleTreeService.js";
import { keccak256, toUtf8Bytes } from "ethers";
import * as circomlibjs from "circomlibjs";
import * as ethers from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * @class ZKProofGenerator
 * @description This class provides methods to generate zero-knowledge proofs for various circuits,
 * including membership, voting, and proposal circuits.
 * It handles the generation of circuit inputs, proof generation, and verification both on-chain and off-chain.
 * It uses the snarkjs library for proof generation and verification, and circomlibjs for cryptographic operations.
 * This version is specifically for Node.js testing environments.
 */
export class ZKProofGenerator {
  // Get the directory of the current file
  static #getPublicDir() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, "..", "..", "..", "public");
  }

  // Membership circuit paths
  static get #MEMBERSHIP_WASM_PATH() {
    return join(
      this.#getPublicDir(),
      "membership_circuit_instance",
      "membership_circuit_instance.wasm"
    );
  }
  static get #MEMBERSHIP_ZKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "membership_circuit_instance",
      "membership_circuit_instance_final.zkey"
    );
  }
  static get #MEMBERSHIP_VKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "membership_circuit_instance",
      "membership_circuit_instance_key.json"
    );
  }

  // Voting circuit paths
  static get #VOTING_WASM_PATH() {
    return join(this.#getPublicDir(), "voting_circuit", "voting_circuit.wasm");
  }
  static get #VOTING_ZKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "voting_circuit",
      "voting_circuit_final.zkey"
    );
  }
  static get #VOTING_VKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "voting_circuit",
      "voting_circuit_key.json"
    );
  }

  // Proposal circuit paths
  static get #PROPOSAL_WASM_PATH() {
    return join(
      this.#getPublicDir(),
      "proposal_circuit",
      "proposal_circuit.wasm"
    );
  }
  static get #PROPOSAL_ZKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "proposal_circuit",
      "proposal_circuit_final.zkey"
    );
  }
  static get #PROPOSAL_VKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "proposal_circuit",
      "proposal_circuit_key.json"
    );
  }

  // Proposal claim circuit paths
  static get #PROPOSAL_CLAIM_WASM_PATH() {
    return join(
      this.#getPublicDir(),
      "proposal_claim_circuit",
      "proposal_claim_circuit.wasm"
    );
  }
  static get #PROPOSAL_CLAIM_ZKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "proposal_claim_circuit",
      "proposal_claim_circuit_final.zkey"
    );
  }
  static get #PROPOSAL_CLAIM_VKEY_PATH() {
    return join(
      this.#getPublicDir(),
      "proposal_claim_circuit",
      "proposal_claim_circuit_key.json"
    );
  }

  // Field modulus for the ZK circuits
  static FIELD_MODULUS = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  // Poseidon instance for hashing
  static #poseidonInstance;

  /**
   * Converts a string to a BigInt representation.
   * This method hashes the string using keccak256 and reduces it modulo the field modulus.
   * @param {string} str - The string to convert.
   * @returns {bigint} The BigInt representation of the string.
   */
  static #stringToBigInt(str) {
    const hash = BigInt(keccak256(toUtf8Bytes(str)));
    return hash % this.FIELD_MODULUS;
  }

  /**
   * Converts an object to a deterministic JSON string.
   * @param {Object} obj - The object to stringify.
   * @returns {string} The deterministic JSON string representation of the object.
   */
  static #deterministicStringify(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
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
   * Converts a file to an ArrayBuffer using Node.js file system.
   * @param {string} filePath - Path to the file to be converted.
   * @returns {Promise<Uint8Array>} A promise that resolves to the ArrayBuffer representation of the file.
   */
  static async #convertToArrayBuffer(filePath) {
    try {
      const buffer = readFileSync(filePath);
      return new Uint8Array(buffer);
    } catch (error) {
      console.error("Error converting file to ArrayBuffer:", error);
      throw error;
    }
  }

  /**
   * Parses the verification key from a JSON file using Node.js file system.
   * @param {string} vKeyPath - Path to the verification key JSON file.
   * @returns {Promise<Object>} The parsed verification key object.
   */
  static async #parseVKey(vKeyPath) {
    try {
      const vKeyData = readFileSync(vKeyPath, "utf8");
      return JSON.parse(vKeyData);
    } catch (error) {
      throw new Error(
        `Failed to read vkey file: ${vKeyPath} - ${error.message}`
      );
    }
  }

  /**
   * Generates a zero-knowledge proof for the specified circuit input.
   * @param {Object} circuitInput - The input data for the circuit.
   * @param {string} circuitType - The type of circuit to use (e.g., "membership", "voting", "proposal").
   * @returns {Promise<Object>} An object containing the generated proof and public signals.
   */
  static async generateProof(circuitInput, circuitType) {
    let wasm, zkey;

    if (circuitType == "membership") {
      wasm = this.#MEMBERSHIP_WASM_PATH;
      zkey = this.#MEMBERSHIP_ZKEY_PATH;
    } else if (circuitType == "voting") {
      wasm = this.#VOTING_WASM_PATH;
      zkey = this.#VOTING_ZKEY_PATH;
    } else if (circuitType == "proposal") {
      wasm = this.#PROPOSAL_WASM_PATH;
      zkey = this.#PROPOSAL_ZKEY_PATH;
    } else if (circuitType == "proposal-claim") {
      wasm = this.#PROPOSAL_CLAIM_WASM_PATH;
      zkey = this.#PROPOSAL_CLAIM_ZKEY_PATH;
    }

    try {
      const wasmBuffer = await this.#convertToArrayBuffer(wasm);
      if (!wasmBuffer) {
        throw new Error(`Failed to load WASM file from ${wasm}`);
      }

      const zkeyBuffer = await this.#convertToArrayBuffer(zkey);
      if (!zkeyBuffer) {
        throw new Error(`Failed to load zkey file from ${zkey}`);
      }

      try {
        const { proof, publicSignals } = await plonk.fullProve(
          circuitInput,
          wasmBuffer,
          zkeyBuffer
        );
        return { proof, publicSignals, circuitType };
      } catch (proveError) {
        console.error("Error in plonk.fullProve:", proveError);
        throw proveError;
      }
    } catch (error) {
      console.error("Error in file loading or proof generation:", error);
      throw error;
    }
  }

  /**
   * Verifies a zero-knowledge proof off-chain using the provided verification key.
   * @param {Object} proof - The proof object to verify.
   * @param {Array} publicSignals - The public signals associated with the proof.
   * @param {string} circuitType - The type of circuit used for the proof (e.g., "membership", "voting", "proposal").
   * @returns {Promise<boolean>} A promise that resolves to true if the proof is valid, false otherwise.
   */
  static async verifyProofOffChain(proof, publicSignals, circuitType) {
    let vkey;
    if (circuitType == "membership") {
      vkey = await this.#parseVKey(this.#MEMBERSHIP_VKEY_PATH);
    } else if (circuitType == "voting") {
      vkey = await this.#parseVKey(this.#VOTING_VKEY_PATH);
    } else if (circuitType == "proposal") {
      vkey = await this.#parseVKey(this.#PROPOSAL_VKEY_PATH);
    } else if (circuitType == "proposal-claim") {
      vkey = await this.#parseVKey(this.#PROPOSAL_CLAIM_VKEY_PATH);
    }

    try {
      const isValid = await plonk.verify(vkey, publicSignals, proof);
      return isValid;
    } catch (error) {
      console.error("Error verifying proof off-chain:", error);
      throw error;
    }
  }

  /**
   * Computes a Poseidon hash of the input values.
   * @param {string|number|Array} input - The input value(s) to hash. Can be a string, number, or array of values.
   * @returns {Promise<string>} The computed hash as a string.
   */
  static async computePoseidonHash(input) {
    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;

    let inputArray;
    if (Array.isArray(input)) {
      // Convert array elements to BigInt
      inputArray = input.map((item) => {
        if (typeof item === "string") {
          return this.#stringToBigInt(item);
        } else if (typeof item === "number") {
          return BigInt(item);
        } else {
          return BigInt(item);
        }
      });
    } else {
      // Single value
      if (typeof input === "string") {
        inputArray = [this.#stringToBigInt(input)];
      } else if (typeof input === "number") {
        inputArray = [BigInt(input)];
      } else {
        inputArray = [BigInt(input)];
      }
    }

    const hashBigInt = F.toObject(poseidon(inputArray));
    return hashBigInt.toString();
  }
}
