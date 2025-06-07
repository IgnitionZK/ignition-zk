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
        "18301975437076688951605982531442620507009188043025261735726303471281552796279",
    },
    {
      commitment_value:
        "19128431862593125093240678832526009953834018963693806080768561024152237934378",
    },
  ];
  const singleCommitmentValue =
    10200179915901109051215990462616205975059062619217578594631574969177607770325n;
  // Create array of all commitment values
  const allCommitments = [
    ...commitmentObjects.map((obj) => BigInt(obj.commitment_value)),
    singleCommitmentValue,
  ];
  console.log(allCommitments);

  // Create merkle tree with all commitments
  const { root } = await MerkleTreeService.createMerkleTree(allCommitments);

  console.log("Generated root:", root);
  console.log(
    "Expected root:",
    "2816585570619196139655348047484435893091094801877254464923708610492590781282"
  );
  console.log(
    "Test passed:",
    root ===
      "2816585570619196139655348047484435893091094801877254464923708610492590781282"
  );

  // Generate and display proof for the first commitment (index 0)
  console.log("\nGenerating proof for first commitment:");
  const proof = await MerkleTreeService.generateMerkleProof(0, allCommitments);
  console.log("Proof details:", JSON.stringify(proof, null, 2));
};

// Run the test
testMerkleTree().catch(console.error);
