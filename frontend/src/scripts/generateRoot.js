import { IMT } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";

/**
 * A service class for generating Merkle trees and proofs.
 * This class provides functionality to create and manage Merkle trees
 * with configurable depth, zero value, and arity,
 * and to generate Merkle proofs for specific leaves.
 */
export class MerkleTreeService {
  // Private class fields
  #tree;
  #depth;
  #zeroValue;
  #arity;
  #leaves = []; // Store leaves for proof generation and utility methods

  /**
   * Creates a new MerkleTreeService instance.
   * @param {number} [depth=5] - The depth of the Merkle tree.
   * @param {bigint|number} [zeroValue=0n] - The zero value used for empty leaves.
   * @param {number} [arity=2] - The arity of the tree (number of children per node).
   */
  constructor(depth = 5, zeroValue = 0n, arity = 2) {
    this.#depth = depth;
    this.#zeroValue = BigInt(zeroValue); // Ensure zeroValue is a BigInt
    this.#arity = arity;

    // Initialize the tree with the poseidon2 hash function and parameters
    this.#tree = new IMT(poseidon2, this.#depth, this.#zeroValue, this.#arity);
  }

  /**
   * Inserts a single leaf into the Merkle tree.
   * @param {string|number|bigint} leafValue - The value of the leaf to insert.
   */
  insertLeaf(leafValue) {
    const bigIntLeaf = BigInt(leafValue); // Ensure leafValue is a BigInt
    this.#leaves.push(bigIntLeaf);
    this.#tree.insert(bigIntLeaf);
    console.log(`Leaf inserted. Current root: ${this.root.toString()}`);
  }

  /**
   * Inserts multiple leaves into the Merkle tree.
   * @param {Array<string|number|bigint>} leafValues - An array of leaf values to insert.
   */
  insertLeaves(leafValues) {
    for (const leaf of leafValues) {
      this.insertLeaf(leaf);
    }
  }

  /**
   * Generates and returns the current Merkle tree root.
   * @returns {bigint} The root hash of the generated Merkle tree.
   */
  get root() {
    return this.#tree.root;
  }

  /**
   * Generates a Merkle proof for a specific leaf at a given index.
   * @param {number} index - The index of the leaf for which to generate the proof.
   * @returns {object} An object containing the Merkle root, leaf value, path elements, and path indices.
   * @throws {Error} If the index is out of bounds or no leaves have been inserted.
   */
  generateProof(index) {
    if (this.#leaves.length === 0) {
      throw new Error("No leaves have been inserted into the tree.");
    }
    if (index < 0 || index >= this.#leaves.length) {
      throw new Error(
        `Index ${index} is out of bounds for the current leaves array (0 to ${
          this.#leaves.length - 1
        }).`
      );
    }

    const leafValue = this.#leaves[index];
    const proof = this.#tree.createProof(index);

    return {
      root: this.root.toString(),
      leaf: leafValue.toString(),
      pathElements: proof.siblings.map((x) => x[0].toString()), // Assuming proof.siblings is an array of arrays
      pathIndices: proof.pathIndices,
    };
  }

  /**
   * Retrieves all current leaves in the tree.
   * @returns {bigint[]} An array of the leaves currently in the tree.
   */
  getLeaves() {
    return [...this.#leaves]; // Return a copy to prevent external modification
  }

  /**
   * Checks if the tree is empty.
   * @returns {boolean} True if the tree contains no leaves, false otherwise.
   */
  isEmpty() {
    return this.#leaves.length === 0;
  }

  /**
   * Resets the Merkle tree to its initial empty state.
   */
  resetTree() {
    this.#leaves = [];
    this.#tree = new IMT(poseidon2, this.#depth, this.#zeroValue, this.#arity);
    console.log("Merkle tree has been reset.");
  }
}
