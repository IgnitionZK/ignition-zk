import { IMT } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";

class MerkleTreeGenerator {
  constructor(depth = 5, zeroValue = 0, arity = 2) {
    this.depth = depth;
    this.zeroValue = zeroValue;
    this.arity = arity;
  }

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
