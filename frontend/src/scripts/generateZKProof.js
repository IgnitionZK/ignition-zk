import { plonk } from "snarkjs";
import { ZkCredential } from "./generateCredentials-browser-safe.js";
import { MerkleTreeService } from "./merkleTreeService.js";
import { keccak256, toUtf8Bytes } from "ethers";
import * as circomlibjs from "circomlibjs";
import * as ethers from "ethers";

/**
 * @class ZKProofGenerator
 * @description This class provides methods to generate zero-knowledge proofs for various circuits,
 * including membership, voting, and proposal circuits.
 * It handles the generation of circuit inputs, proof generation, and verification both on-chain and off-chain.
 * It uses the snarkjs library for proof generation and verification, and circomlibjs for cryptographic operations.
 */
export class ZKProofGenerator {
  // Membership circuit paths
  static #MEMBERSHIP_WASM_PATH = "/membership_circuit/membership_circuit.wasm";
  static #MEMBERSHIP_ZKEY_PATH =
    "/membership_circuit/membership_circuit_final.zkey";
  static #MEMBERSHIP_VKEY_PATH =
    "/membership_circuit/membership_circuit_key.json";

  // Voting circuit paths
  static #VOTING_WASM_PATH = "";
  static #VOTING_ZKEY_PATH = "";
  static #VOTING_VKEY_PATH = "";

  // Proposal circuit paths
  static #PROPOSAL_WASM_PATH = "/proposal_circuit/proposal_circuit.wasm";
  static #PROPOSAL_ZKEY_PATH = "/proposal_circuit/proposal_circuit_final.zkey";
  static #PROPOSAL_VKEY_PATH = "/proposal_circuit/proposal_circuit_key.json";

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
   * Generates the input for the Merkle proof circuit.
   * @param {string} mnemonic - The mnemonic phrase used to generate the identity.
   * @param {Array<BigInt>} commitmentArray - An array of commitment values to use for the Merkle proof.
   * @returns {Promise<Object>} An object containing the circuit input including root, identity trapdoor, identity nullifier, path elements, and path indices.
   */
  static async generateMerkleProofInput(mnemonic, commitmentArray) {
    console.log("Generating Merkle proof input...");
    const seed = ZkCredential.generateSeedFromMnemonic(mnemonic);
    console.log("Seed generated from mnemonic:", seed);
    const { trapdoorKey, nullifierKey } = ZkCredential.generateKeys(seed);
    console.log("Trapdoor Key:", trapdoorKey);
    const { trapdoor, nullifier, commitment } =
      await ZkCredential.generateIdentity(trapdoorKey, nullifierKey);
    console.log("Trapdoor:", trapdoor);
    console.log("Nullifier:", nullifier);
    console.log("Commitment:", commitment);

    const index = commitmentArray.findIndex((leaf) => leaf === commitment);
    console.log("Commitment Index:", index);

    const { root, pathElements, pathIndices } =
      await MerkleTreeService.generateMerkleProof(index, commitmentArray);
    console.log("Merkle Root:", root);
    console.log("Path Elements:", pathElements);
    console.log("Path Indices:", pathIndices);

    return {
      root: root.toString(),
      identityTrapdoor: trapdoor.toString(),
      identityNullifier: nullifier.toString(),
      pathElements,
      pathIndices: pathIndices.map((index) => index.toString()),
    };
  }

  /**
   * Generates the inputs for the Membership circuit for a given mnemonic and commitment array.
   * @param {string} mnemonic - The mnemonic phrase used to generate the identity.
   * @param {Array<BigInt>} commitmentArray - An array of commitment values to use for the Merkle proof.
   * @param {string} groupId - The group ID to include as context in the circuit input.
   * @returns {Promise<Object>} An object containing the circuit input including root, identity trapdoor, identity nullifier, group hash, path elements, and path indices.
   */
  static async generateMembershipCircuitInput(
    mnemonic,
    commitmentArray,
    groupId
  ) {
    const merkleProofInput = await this.generateMerkleProofInput(
      mnemonic,
      commitmentArray
    );
    const groupHashBigInt = this.#stringToBigInt(groupId);
    console.log("Group Hash BigInt:", groupHashBigInt);

    const circuitInput = {
      root: merkleProofInput.root,
      identityTrapdoor: merkleProofInput.identityTrapdoor,
      identityNullifier: merkleProofInput.identityNullifier,
      groupHash: groupHashBigInt.toString(),
      pathElements: merkleProofInput.pathElements,
      pathIndices: merkleProofInput.pathIndices.map((index) =>
        index.toString()
      ),
    };

    console.log("Circuit Input:", circuitInput);

    return circuitInput;
  }

  /**
   * Generates the inputs for the proposal submission circuit.
   * @param {string} mnemonic - The mnemonic phrase used to generate the identity.
   * @param {Array<BigInt>} commitmentArray - An array of commitment values to use for the Merkle proof.
   * @param {string} groupId - The group ID to include as context in the circuit input.
   * @param {string} epochId - The epoch ID to include as context in the circuit input.
   * @param {string} proposalTitle - The title of the proposal.
   * @param {string} proposalDescription - The description of the proposal.
   * @param {Object} proposalPayload - The payload of the proposal, which can include various parameters.
   * @returns {Promise<Object>}
   * An object containing the circuit input including root, identity trapdoor, identity nullifier, group hash, epoch hash, proposal title, proposal description, proposal payload, and path elements.
   */
  static async generateProposalCircuitInput(
    mnemonic,
    commitmentArray,
    groupId,
    epochId,
    proposalTitle,
    proposalDescription,
    proposalPayload
  ) {
    const merkleProofInput = await this.generateMerkleProofInput(
      mnemonic,
      commitmentArray
    );

    console.log("Merkle Proof Input:", merkleProofInput);

    const groupHashBigInt = this.#stringToBigInt(groupId);
    const epochHashBigInt = this.#stringToBigInt(epochId);
    const proposalTitleBigInt = this.#stringToBigInt(proposalTitle);
    const proposalDescriptionBigInt = this.#stringToBigInt(proposalDescription);
    const proposalPayloadBigInt = this.#stringToBigInt(
      this.#deterministicStringify(proposalPayload)
    );
    console.log("Group Hash BigInt:", groupHashBigInt);
    console.log("Epoch Hash BigInt:", epochHashBigInt);
    console.log("Proposal Title BigInt:", proposalTitleBigInt);
    console.log("Proposal Description BigInt:", proposalDescriptionBigInt);
    console.log("Proposal Payload BigInt:", proposalPayloadBigInt);

    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;
    const proposalContentHash = F.toObject(
      poseidon([
        proposalTitleBigInt,
        proposalDescriptionBigInt,
        proposalPayloadBigInt,
      ])
    );
    console.log("Proposal Content Hash:", proposalContentHash);

    const proposalContextHash = F.toObject(
      poseidon([groupHashBigInt, epochHashBigInt])
    );
    console.log("Proposal Context Hash:", proposalContextHash);

    const circuitInput = {
      root: merkleProofInput.root,
      proposalContentHash: proposalContentHash.toString(),
      identityTrapdoor: merkleProofInput.identityTrapdoor,
      identityNullifier: merkleProofInput.identityNullifier,
      pathElements: merkleProofInput.pathElements,
      pathIndices: merkleProofInput.pathIndices.map((index) =>
        index.toString()
      ),
      proposalTitleHash: proposalTitleBigInt.toString(),
      proposalDescriptionHash: proposalDescriptionBigInt.toString(),
      proposalPayloadHash: proposalPayloadBigInt.toString(),
      groupHash: groupHashBigInt.toString(),
      epochHash: epochHashBigInt.toString(),
    };

    console.log("Proposal Circuit Input:", circuitInput);

    return circuitInput;
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
      const rawCalldata = await plonk.exportSolidityCallData(
        proof,
        publicSignals
      );
      const calldata = `[${rawCalldata}]`.replace("][", "],[");

      let [_proof, _publicSignals] = JSON.parse(calldata);

      // convert _proof and _publicSignals to BigInts to match the expected method parameter input types
      _proof = _proof.map((x) => BigInt(x));
      _publicSignals = _publicSignals.map((x) => BigInt(x));

      return {
        proofSolidity: _proof,
        publicSignalsSolidity: _publicSignals,
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
  static async verifyProofOnChain(
    proofSolidity,
    publicSignalsSolidity,
    contract
  ) {
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

  /**
   * Computes the context key using Poseidon hash from groupKey and epochKey.
   * This is used for proposal verification to create the context hash.
   * @param {string} groupKey - The group key string.
   * @param {string} epochKey - The epoch key string.
   * @returns {Promise<string>} The computed context key as a hex string.
   */
  static async computeContextKey(groupKey, epochKey) {
    const groupHashBigInt = this.#stringToBigInt(groupKey);
    const epochHashBigInt = this.#stringToBigInt(epochKey);

    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;
    const contextHashBigInt = F.toObject(
      poseidon([groupHashBigInt, epochHashBigInt])
    );

    // Convert to hex string for better compatibility with ethers.js
    return ethers.toBeHex(contextHashBigInt);
  }
}
