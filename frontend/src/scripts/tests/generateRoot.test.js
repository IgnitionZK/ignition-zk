import { MerkleTreeService } from "../merkleTreeService.js";

/**
 * Tests the MerkleTreeService functionality by verifying root generation
 * with a known set of commitment values.
 *
 * This test uses a specific example with:
 * - A single commitment object with a predefined value
 * - A single commitment value as a BigInt
 *
 * The test verifies that the generated root matches the expected value:
 * "680780018581728271426222388546552142147820390769025677186621783736598362542"
 */
const testMerkleTree = async () => {
  // Test with the example values from comments
  const commitmentObjects = [
    {
      commitment_value:
        "4569404356060217892567000226667571007085840243496351421444043897830417204841",
    },
  ];
  const singleCommitmentValue =
    21565830651962172967289248360519028712249373956516218692264979672623543179659n;

  // Create array of all commitment values
  const allCommitments = [
    ...commitmentObjects.map((obj) => BigInt(obj.commitment_value)),
    singleCommitmentValue,
  ];

  // Create merkle tree with all commitments
  const { root } = await MerkleTreeService.createMerkleTree(allCommitments);

  console.log("Generated root:", root);
  console.log(
    "Expected root:",
    "6288498092224451765349377587088464623948296876784490711334113964722103913972"
  );
  console.log(
    "Test passed:",
    root ===
      "6288498092224451765349377587088464623948296876784490711334113964722103913972"
  );

  // Generate and display proof for the first commitment (index 0)
  console.log("\nGenerating proof for first commitment:");
  const proof = await MerkleTreeService.generateMerkleProof(0, allCommitments);
  console.log("Proof details:", JSON.stringify(proof, null, 2));
};

// Run the test
testMerkleTree().catch(console.error);
