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
        "18542401090204566243593041266509016391106809403929295783279372702922347973218",
    },
    {
      commitment_value:
        "4855139869605244460670050730810796654058639838745333684826983922418488834955",
    },
  ];
  const singleCommitmentValue =
    17407540925533418293037768568283548809278187951133537192913816185756450737740n;
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
    "60833269661901831284991364166993258570409755072845072681144846546614438111"
  );
  console.log(
    "Test passed:",
    root ===
      "60833269661901831284991364166993258570409755072845072681144846546614438111"
  );

  // Generate and display proof for the first commitment (index 0)
  console.log("\nGenerating proof for first commitment:");
  const proof = await MerkleTreeService.generateMerkleProof(0, allCommitments);
  console.log("Proof details:", JSON.stringify(proof, null, 2));
};

// Run the test
testMerkleTree().catch(console.error);
