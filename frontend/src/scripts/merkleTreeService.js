import * as circomlibjs from "circomlibjs";
import { IMT } from "@zk-kit/imt";

export class MerkleTreeService {
  static #TREE_DEPTH = 10;
  static #ZERO_ELEMENT = BigInt(0);
  static #ARITY = 2;
  static #poseidonInstance;

  /**
   * Initializes the Poseidon hash function.
   * @private
   * @returns {Promise<Function>} A promise that resolves to the Poseidon hash function.
   */
  static async #getPoseidonHashFn() {
    if (!this.#poseidonInstance) {
      this.#poseidonInstance = await circomlibjs.buildPoseidon();
    }
    const poseidon = this.#poseidonInstance;
    const F = poseidon.F;

    return (inputs) => F.toObject(poseidon(inputs));
  }

  /**
   * Creates a new Merkle tree using the provided hashed leaves.
   * @param {Array<BigInt>} hashedLeaves - An array of BigInts representing the hashed leaves.
   * @returns {Promise<{tree: IMT, root: string}>} An object containing the generated Merkle tree instance and its root.
   */
  static async createMerkleTree(hashedLeaves) {
    const hashFn = await this.#getPoseidonHashFn();

    const tree = new IMT(
      hashFn,
      this.#TREE_DEPTH,
      this.#ZERO_ELEMENT,
      this.#ARITY,
      hashedLeaves
    );

    return {
      tree: tree,
      root: tree.root.toString(),
    };
  }

  /**
   * Generates a Merkle proof for a specific leaf at a given index.
   * @param {number} index - The index of the leaf for which to generate the proof.
   * @param {Array<BigInt>} hashedLeaves - An array of BigInts representing all hashed leaves in the tree.
   * @returns {Promise<{root: string, leaf: string, pathElements: string[], pathIndices: number[]}>} An object containing the Merkle proof details.
   */
  static async generateMerkleProof(index, hashedLeaves) {
    const { tree, root } = await this.createMerkleTree(hashedLeaves);

    const leafValue = hashedLeaves[index];
    const proof = tree.createProof(index);

    return {
      root: root,
      leaf: leafValue.toString(),
      pathElements: proof.siblings.map((x) => x.toString()),
      pathIndices: proof.pathIndices,
    };
  }
}
