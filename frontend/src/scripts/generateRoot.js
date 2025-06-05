import { IMT } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";

/**
 * A class for generating Merkle trees using the IMT (Incremental Merkle Tree) implementation.
 * This class provides functionality to create and manage Merkle trees with configurable depth,
 * zero value, and arity.
 */
class MerkleTreeGenerator {
  /**
   * Creates a new MerkleTreeGenerator instance.
   * @param {number} [depth=5] - The depth of the Merkle tree.
   * @param {number} [zeroValue=0] - The zero value used for empty leaves.
   * @param {number} [arity=2] - The arity of the tree (number of children per node).
   */
  constructor(depth = 5, zeroValue = 0, arity = 2) {
    this.depth = depth;
    this.zeroValue = zeroValue;
    this.arity = arity;
  }

  /**
   * Generates a Merkle tree root from an array of commitment objects and a single commitment value.
   * @param {Array<{commitment_value: string|number}>} commitmentObjects - Array of objects containing commitment values.
   * @param {string|number} singleCommitmentValue - A single commitment value to be added to the tree.
   * @returns {bigint} The root hash of the generated Merkle tree.
   */
  generateRoot(commitmentObjects, singleCommitmentValue) {
    // Handle empty commitmentObjects array
    const leaves =
      commitmentObjects.length === 0
        ? [singleCommitmentValue]
        : [
            ...commitmentObjects.map((obj) => BigInt(obj.commitment_value)),
            singleCommitmentValue,
          ];

    // Initialize and return the tree
    const tree = new IMT(
      poseidon2,
      this.depth,
      this.zeroValue,
      this.arity,
      leaves
    );
    return tree.root;
  }
}

export default MerkleTreeGenerator;
