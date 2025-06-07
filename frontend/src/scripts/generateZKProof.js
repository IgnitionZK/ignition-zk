import { plonk, zKey } from "snarkjs";
import { ZkCredential } from "./generateCredentials-browser-safe.js";
import { MerkleTreeService } from "./merkleTreeService.js";
import { promises as fs } from "fs";
import { group } from "console";

export class ZKProofGenerator {
  // Membership circuit paths
  static #MEMBERSHIP_WASM_PATH =
    "../zk/circuits/membership/build/membership_circuit_js/membership_circuit.wasm";
  static #MEMBERSHIP_ZKEY_PATH =
    "../zk/circuits/membership/build/membership_circuit_final.zkey";
  static #MEMBERSHIP_VKEY_PATH =
    "../zk/circuits/membership/build/membership_circuit_key.json";

  // Voting circuit paths
  static #VOTING_WASM_PATH = "";
  static #VOTING_ZKEY_PATH = "";
  static #VOTING_VKEY_PATH = "";

  // Proposal circuit paths
  static #PROPOSAL_WASM_PATH = "";
  static #PROPOSAL_ZKEY_PATH = "";
  static #PROPOSAL_VKEY_PATH = "";

  /**
   * Converts a file to an ArrayBuffer.
   * @param {string} filePath - Path to the file to be converted.
   * @returns {Promise<ArrayBuffer>} A promise that resolves to the ArrayBuffer representation of the file.
   */
  static async #convertToArrayBuffer(filePath) {
    try {
      const response = await fs.readFile(filePath);
      return response;
      // Browser environment:
      //const response = await fetch(filePath); -- use fetch if running in a browser environment
      //if (!response.ok) {
      //    throw new Error(`Failed to fetch file: ${filePath}`);
      //}
      //return await response.arrayBuffer(); -- convert to ArrayBuffer if using fetch
    } catch (error) {
      console.error("Error converting file to ArrayBuffer:", error);
    }
  }

  /**
   * Parses the verification key from a JSON file.
   * @param {string} vKeyPath - Path to the verification key JSON file.
   * @returns {Promise<Object>} The parsed verification key object.
   */
  static async #parseVKey(vKeyPath) {
    const vKey = await fs.readFile(vKeyPath, "utf8");
    return await JSON.parse(vKey);
  }

  /**
   * Filters leaves by group ID and returns an array of commitment values.
   * @param {string} leavesJson - Path to the JSON file containing leaves data.
   * @param {string} groupId - The group ID to filter leaves by.
   * @returns {Promise<Array<BigInt>>} An array of commitment values for the specified group ID.
   */
  static async filterLeavesByGroupId(leavesJson, groupId) {
    let leaves = await fs.readFile(leavesJson, "utf8");
    leaves = JSON.parse(leaves);

    const filteredLeaves = leaves.filter((leaf) => leaf.group_id === groupId);
    const commitmentArray = filteredLeaves.map((leaf) =>
      BigInt(leaf.commitment_value)
    );

    return commitmentArray;
  }

  /**
   * Generates the circuit input for a given mnemonic and commitment array.
   * @param {string} mnemonic - The mnemonic phrase used to generate the identity.
   * @param {Array<BigInt>} commitmentArray - An array of commitment values to use for the Merkle proof.
   * @returns {Promise<Object>} An object containing the circuit input including root, identity trapdoor, identity nullifier, path elements, and path indices.
   */
  static async generateCircuitInput(mnemonic, commitmentArray) {
    const seed = ZkCredential.generateSeedFromMnemonic(mnemonic);
    const { trapdoorKey, nullifierKey } = ZkCredential.generateKeys(seed);
    const { trapdoor, nullifier, commitment } =
      await ZkCredential.generateIdentity(trapdoorKey, nullifierKey);

    const index = commitmentArray.findIndex((leaf) => leaf === commitment);

    const { root, pathElements, pathIndices } =
      await MerkleTreeService.generateMerkleProof(index, commitmentArray);

    const circuitInput = {
      root,
      identityTrapdoor: trapdoor.toString(),
      identityNullifier: nullifier.toString(),
      pathElements,
      pathIndices: pathIndices.map((index) => index.toString()),
    };

    console.log("Circuit Input:", circuitInput);

    return circuitInput;
  }

  /**
   * Generates a zero-knowledge proof for the specified circuit input.
   * @param {Object} circuitInput - The input data for the circuit.
   * @param {string} [circuitType="membership"] - The type of circuit to use (e.g., "membership", "voting", "proposal").
   * @returns {Promise<Object>} An object containing the generated proof and public signals.
   */
  static async generateProof(circuitInput, circuitType = "membership") {
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
    }

    const wasmBuffer = await this.#convertToArrayBuffer(wasm);
    const zkeyBuffer = await this.#convertToArrayBuffer(zkey);

    if (!wasmBuffer || !zkeyBuffer) {
      throw new Error("Failed to load WASM or zkey files.");
    }

    try {
      const { proof, publicSignals } = await plonk.fullProve(
        circuitInput,
        wasmBuffer,
        zkeyBuffer
      );

      return {
        proof,
        publicSignals,
      };
    } catch (error) {
      console.error("Error generating membership proof:", error);
      throw error;
    }
  }

  /**
   * Verifies a zero-knowledge proof off-chain using the provided verification key.
   * @param {Object} proof - The proof object to verify.
   * @param {Array} publicSignals - The public signals associated with the proof.
   * @param {string} [circuitType="membership"] - The type of circuit used for the proof (e.g., "membership", "voting", "proposal").
   * @returns {Promise<boolean>} A promise that resolves to true if the proof is valid, false otherwise.
   */
  static async verifyProofOffChain(
    proof,
    publicSignals,
    circuitType = "membership"
  ) {
    let vkey;
    if (circuitType == "membership") {
      vkey = await this.#parseVKey(this.#MEMBERSHIP_VKEY_PATH);
    } else if (circuitType == "voting") {
      vkey = await this.#parseVKey(this.#VOTING_VKEY_PATH);
    } else if (circuitType == "proposal") {
      vkey = await this.#parseVKey(this.#PROPOSAL_VKEY_PATH);
    }

    try {
      const isValid = await plonk.verify(vkey, publicSignals, proof);
      return isValid;
    } catch (error) {
      console.error("Error verifying proof off-chain:", error);
      throw error;
    }
  }

  static async verifyProofOnChain(proof, publicSignals, contract) {
    try {
      const isValid = await contract.verifyMembershipProof(
        proof,
        publicSignals
      );
      console.log("On-chain proof verification result:", isValid);
      return isValid;
    } catch (error) {
      console.error("Error verifying proof on-chain:", error);
      throw error;
    }
  }
}
