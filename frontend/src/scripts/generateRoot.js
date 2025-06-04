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

// Test the MerkleTreeGenerator
// const testMerkleTree = () => {
//   const generator = new MerkleTreeGenerator();

//   // Test with the example values from comments
//   const commitmentObjects = [
//     {
//       commitment_value:
//         "3103428871660093103301865438619118877599551719479987936516702279787488951583",
//     },
//   ];
//   const singleCommitmentValue =
//     7038233927463309561526140108843129958428432865148098462338649598769188986862n;

//   const root = generator.generateRoot(commitmentObjects, singleCommitmentValue);
//   console.log("Generated root:", root.toString());
//   console.log(
//     "Expected root:",
//     "9732036971669324381539610224339760129520267967251323371954867991414987061220"
//   );
//   console.log(
//     "Test passed:",
//     root.toString() ===
//       "9732036971669324381539610224339760129520267967251323371954867991414987061220"
//   );
// };

// // Run the test
// testMerkleTree();
