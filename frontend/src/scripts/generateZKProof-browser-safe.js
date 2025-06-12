import { plonk } from "snarkjs";
import { ZkCredential } from "./generateCredentials-browser-safe.js";
import { MerkleTreeService } from "./merkleTreeService.js";
import { promises as fs } from "fs";
import { keccak256, toUtf8Bytes } from "ethers";

export class ZKProofGenerator {
  // Membership circuit paths
  
  static #MEMBERSHIP_WASM_PATH = "/membership_circuit/membership_circuit.wasm";
  static #MEMBERSHIP_ZKEY_PATH = "/membership_circuit/membership_circuit_final.zkey";
  static #MEMBERSHIP_VKEY_PATH = "/membership_circuit/membership_circuit_key.json";
  
  // Voting circuit paths
  static #VOTING_WASM_PATH = "";
  static #VOTING_ZKEY_PATH = "";
  static #VOTING_VKEY_PATH = "";

  // Proposal circuit paths
  static #PROPOSAL_WASM_PATH = "";
  static #PROPOSAL_ZKEY_PATH = "";
  static #PROPOSAL_VKEY_PATH = "";

  
  /**
   * Converts a UUID string to a BigInt representation.
   * @param {string} uuid - The UUID string to convert.
   * @returns {bigint} The BigInt representation of the UUID.
   */
  static #uuidToBigInt(uuid) {
    return BigInt(keccak256(toUtf8Bytes(uuid)));
  }

  /**
   * Converts a file to an ArrayBuffer.
   * @param {string} filePath - Path to the file to be converted.
   * @returns {Promise<Uint8Array>} A promise that resolves to the ArrayBuffer representation of the file.
   */
  static async #convertToArrayBuffer(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${filePath}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (error) {
      console.error("Error converting file to ArrayBuffer:", error);
      throw error;
    }
  }

  /**
   * Parses the verification key from a JSON file.
   * @param {string} vKeyPath - Path to the verification key JSON file.
   * @returns {Promise<Object>} The parsed verification key object.
   */
  static async #parseVKey(vKeyPath) {
    const vKey = await fetch(vKeyPath);
    if (!vKey.ok) {
      throw new Error(`Failed to fetch vkey file: ${vKeyPath}`);
    }
    return await vKey.json();
  }

  /**
   * Filters leaves by group ID and returns an array of commitment values.
   * @param {string} leavesJson - Path to the JSON file containing leaves data.
   * @param {string} groupId - The group ID to filter leaves by.
   * @returns {Promise<Array<BigInt>>} An array of commitment values for the specified group ID.
   */
  static async filterLeavesByGroupId(leavesJson, groupId) {
    let response = await fetch(leavesJson);
    if (!response.ok) {
      throw new Error(`Failed to fetch leaves JSON: ${leavesJson}`);
    }
    const leaves = await response.json();

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
  static async generateCircuitInput(mnemonic, commitmentArray, externalNullifier) {
    const seed = ZkCredential.generateSeedFromMnemonic(mnemonic);
    const { trapdoorKey, nullifierKey } = ZkCredential.generateKeys(seed);
    const { trapdoor, nullifier, commitment } =
      await ZkCredential.generateIdentity(trapdoorKey, nullifierKey);

    const index = commitmentArray.findIndex((leaf) => leaf === commitment);

    const { root, pathElements, pathIndices } =
      await MerkleTreeService.generateMerkleProof(index, commitmentArray);
    
    const externalNullifierBigInt = this.#uuidToBigInt(externalNullifier);
    console.log("External Nullifier BigInt:", externalNullifierBigInt);

    const circuitInput = {
      root,
      identityTrapdoor: trapdoor.toString(),
      identityNullifier: nullifier.toString(),
      externalNullifier: externalNullifierBigInt.toString(),
      pathElements,
      pathIndices: pathIndices.map((index) => index.toString())
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
        return { proof, publicSignals };
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

  /**
   *  Generates Solidity calldata from the proof and public signals.
   *  This function converts the proof and public signals into a format suitable for Solidity smart contracts.
   *  @param {Object} proof - The proof object generated by the ZK circuit.
   *  @param {Array} publicSignals - The public signals associated with the proof.
   *  @returns {Promise<Object>} An object containing the proof and public signals formatted for Solidity.
   */
  static async generateSolidityCalldata(proof, publicSignals) {
    try {
      const rawCalldata = await plonk.exportSolidityCallData(proof, publicSignals);
      const calldata = `[${rawCalldata}]`.replace("][", "],[");

      let [_proof, _publicSignals] = JSON.parse(calldata);

      // convert _proof and _publicSignals to BigInts to match the expected method parameter input types
      _proof = _proof.map((x) => BigInt(x));
      _publicSignals = _publicSignals.map((x) => BigInt(x));

      return {
        proofSolidity: _proof,
        publicSignalsSolidity: _publicSignals
      };
    } catch (error) {
      console.error("Error generating Solidity calldata:", error);
      throw error;
    }

  }

  /**
   * Verifies a zero-knowledge proof on-chain using a smart contract.
   * @param {Array} proofSolidity - The proof in Solidity format.
   * @param {Array} publicSignalsSolidity - The public signals in Solidity format.
   * @param {Object} contract - The smart contract instance that implements the verification function.
   * @returns {Promise<boolean>} A promise that resolves to true if the proof is valid, false otherwise.
   */
  static async verifyProofOnChain(proofSolidity, publicSignalsSolidity, contract) {
    try {
      const isValid = await contract.verifyProof(
        proofSolidity,
        publicSignalsSolidity
      );
      return isValid;
    } catch (error) {
      console.error("Error verifying proof on-chain:", error);
      throw error;
    }
  }
}
