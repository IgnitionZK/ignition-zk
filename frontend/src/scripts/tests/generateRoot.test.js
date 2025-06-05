import { MerkleTreeService } from "../generateRoot.js";

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
  const merkleService = new MerkleTreeService();

  // Test with the example values from comments
  const commitmentObjects = [
    {
      commitment_value:
        "19390292043422339260847467200953875780798709567123589708718186347656518151257",
    },
  ];
  const singleCommitmentValue =
    12121353085160087440887344551642837028869145131855022171875984584633137567556n;

  // Insert all commitments from commitmentObjects
  if (commitmentObjects.length > 0) {
    await merkleService.insertLeaves(
      commitmentObjects.map((obj) => obj.commitment_value)
    );
  }

  // Insert the single commitment value
  await merkleService.insertLeaf(singleCommitmentValue);

  const root = merkleService.root;
  console.log("Generated root:", root.toString());
  console.log(
    "Expected root:",
    "680780018581728271426222388546552142147820390769025677186621783736598362542"
  );
  console.log(
    "Test passed:",
    root.toString() ===
      "680780018581728271426222388546552142147820390769025677186621783736598362542"
  );

  // Generate and display proof for the first commitment (index 0)
  console.log("\nGenerating proof for first commitment:");
  const proof = merkleService.generateProof(0);
  console.log("Proof details:", JSON.stringify(proof, null, 2));
};

// Run the test
testMerkleTree().catch(console.error);
