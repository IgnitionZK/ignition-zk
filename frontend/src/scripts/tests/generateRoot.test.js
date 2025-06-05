import MerkleTreeGenerator from "../generateRoot.js";

/**
 * Tests the MerkleTreeGenerator functionality by verifying root generation
 * with a known set of commitment values.
 *
 * This test uses a specific example with:
 * - A single commitment object with a predefined value
 * - A single commitment value as a BigInt
 *
 * The test verifies that the generated root matches the expected value:
 * "5665068093291831323708960256511662356700546527496210741764922436226427645666"
 */
const testMerkleTree = () => {
  const generator = new MerkleTreeGenerator();

  // Test with the example values from comments
  const commitmentObjects = [
    {
      commitment_value:
        "20707628359917815372630971443132236475295999572285704048444445963483174580652",
    },
  ];
  const singleCommitmentValue =
    10233137082165827203647907824912322699075000046512222696061552889565413985684n;

  const root = generator.generateRoot(commitmentObjects, singleCommitmentValue);
  console.log("Generated root:", root.toString());
  console.log(
    "Expected root:",
    "5665068093291831323708960256511662356700546527496210741764922436226427645666"
  );
  console.log(
    "Test passed:",
    root.toString() ===
      "5665068093291831323708960256511662356700546527496210741764922436226427645666"
  );
};

// Run the test
testMerkleTree();
