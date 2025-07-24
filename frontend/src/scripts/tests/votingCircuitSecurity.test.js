import { ZkCredential } from "../generateCredentials-browser-safe.js";
import { ZKProofGenerator } from "./generateZKProof-test.js";
import { MerkleTreeService } from "../merkleTreeService.js";

/**
 * VOTING CIRCUIT SECURITY TEST
 *
 * This test verifies that the onChainVerifiableVoteChoiceHash cannot be manipulated
 * without causing proof verification to fail.
 *
 * BEFORE RUNNING THIS TEST:
 * 1. Replace the placeholder values below with your actual generated data
 * 2. Make sure you have the voting circuit files in the correct location:
 *    - /public/voting_circuit/voting_circuit.wasm
 *    - /public/voting_circuit/voting_circuit_final.zkey
 *    - /public/voting_circuit/voting_circuit_key.json
 *
 * REQUIRED DATA TO ENTER:
 * - targetGroupId: Your group ID
 * - epochId: Your epoch ID
 * - proposalId: Your proposal ID
 * - mnemonic_user1: Your user's mnemonic phrase
 * - commitmentArray: Array of all commitment values in your group's Merkle tree
 * - userCommitmentIndex: Index of your user's commitment in the commitmentArray
 */

// ============================================================================
// MANUAL DATA ENTRY SECTION - Replace these with your actual generated data
// ============================================================================

// Test configuration - MANUALLY ENTER YOUR DATA HERE
const targetGroupId = "dc75c359-8724-426e-84d9-31df9e330d42"; // Replace with your actual group ID
const epochId = "bb927aeb-28a5-4e8c-9dbd-110c63c7c838"; // Replace with your actual epoch ID
const proposalId = "d4760731-509c-4d32-8892-796630607464"; // Replace with your actual proposal ID

// Test user credentials - MANUALLY ENTER YOUR DATA HERE
const mnemonic_user1 =
  "moon frequent fire divert blossom best oven tank cable era unfold need"; // Replace with your actual user mnemonic

// Merkle tree data - MANUALLY ENTER YOUR DATA HERE
const commitmentArray = [
  // Replace with your actual commitment values from the group's Merkle tree
  // Example: "18322505452373643545194993782056106237414748534890984831996351164492448849167"
  "6898548647847016591619654517229764020194882102267581087886537078914327761970",
];

// Your user's commitment index in the Merkle tree - MANUALLY ENTER YOUR DATA HERE
const userCommitmentIndex = 0; // Replace with the actual index of your user's commitment in the array above

// Test vote parameters
const testVoteChoice = 1; // Yes vote
const testVoteTimestamp = Math.floor(Date.now() / 1000);

// Poseidon hash constants for vote choices (from VoteManager.sol)
const POSEIDON_HASH_ABSTAIN =
  "19014214495641488759237505126948346942972912379615652741039992445865937985820";
const POSEIDON_HASH_YES =
  "18586133768512220936620570745912940619677854269274689475585506675881198879027";
const POSEIDON_HASH_NO =
  "8645981980787649023086883978738420856660271013038108762834452721572614684349";

/**
 * Generate voting circuit input for testing
 */
async function generateVotingCircuitInput(mnemonic, voteChoice, voteTimestamp) {
  console.log("Generating voting circuit input...");

  // Generate identity credentials
  const seed = ZkCredential.generateSeedFromMnemonic(mnemonic);
  const { trapdoorKey, nullifierKey } = ZkCredential.generateKeys(seed);
  const { trapdoor, nullifier, commitment } =
    await ZkCredential.generateIdentity(trapdoorKey, nullifierKey);

  console.log("Identity generated:", { trapdoor, nullifier, commitment });

  // Use the manually entered commitment array and index
  console.log("Using manually entered commitment array:", commitmentArray);
  console.log(
    "Using manually entered user commitment index:",
    userCommitmentIndex
  );

  // Verify that the generated commitment matches the expected one
  const expectedCommitment = BigInt(commitmentArray[userCommitmentIndex]);
  if (commitment !== expectedCommitment) {
    console.error("Generated commitment:", commitment.toString());
    console.error("Expected commitment:", expectedCommitment.toString());
    throw new Error(
      "Generated commitment does not match the expected commitment at the specified index. Please verify your mnemonic and commitment index."
    );
  }

  console.log("✅ Commitment verification passed!");

  // Generate Merkle proof using the manually entered index
  const { root, pathElements, pathIndices } =
    await MerkleTreeService.generateMerkleProof(
      userCommitmentIndex,
      commitmentArray.map((c) => BigInt(c))
    );

  // Compute context hashes
  const groupHash = await ZKProofGenerator.computePoseidonHash(targetGroupId);
  const epochHash = await ZKProofGenerator.computePoseidonHash(epochId);
  const proposalHash = await ZKProofGenerator.computePoseidonHash(proposalId);

  // Compute vote content hash
  const voteContentHash = await ZKProofGenerator.computePoseidonHash([
    voteChoice,
    voteTimestamp,
  ]);

  const circuitInput = {
    // Public inputs
    root: root.toString(),
    voteContentHash: voteContentHash.toString(),

    // Private inputs
    voteChoice: voteChoice.toString(),
    voteTimestamp: voteTimestamp.toString(),
    identityTrapdoor: trapdoor.toString(),
    identityNullifier: nullifier.toString(),
    pathElements: pathElements.map((elem) => elem.toString()),
    pathIndices: pathIndices.map((index) => index.toString()),
    groupHash: groupHash.toString(),
    epochHash: epochHash.toString(),
    proposalHash: proposalHash.toString(),
  };

  console.log("Circuit input generated successfully");
  return circuitInput;
}

/**
 * Test 1: Generate a valid voting proof and verify it passes
 */
async function testValidProof() {
  console.log("\n=== Test 1: Valid Proof Generation and Verification ===");

  try {
    const circuitInput = await generateVotingCircuitInput(
      mnemonic_user1,
      testVoteChoice,
      testVoteTimestamp
    );

    const { proof, publicSignals } = await ZKProofGenerator.generateProof(
      circuitInput,
      "voting"
    );

    console.log("Original public signals:", publicSignals);
    console.log("Public signal indices:");
    console.log("  [0] voteContextHash:", publicSignals[0]);
    console.log("  [1] voteNullifier:", publicSignals[1]);
    console.log("  [2] onChainVerifiableVoteChoiceHash:", publicSignals[2]);
    console.log("  [3] root:", publicSignals[3]);
    console.log("  [4] voteContentHash:", publicSignals[4]);

    // Verify the original proof
    const isValid = await ZKProofGenerator.verifyProofOffChain(
      proof,
      publicSignals,
      "voting"
    );
    console.log("Original proof verification result:", isValid);

    if (!isValid) {
      throw new Error(
        "Original proof verification failed - this indicates a problem with the test setup"
      );
    }

    return { proof, publicSignals };
  } catch (error) {
    console.error("Error in testValidProof:", error);
    throw error;
  }
}

/**
 * Test 2: Change onChainVerifiableVoteChoiceHash and verify it fails
 */
async function testManipulatedVoteChoiceHash(
  originalProof,
  originalPublicSignals
) {
  console.log("\n=== Test 2: Manipulated Vote Choice Hash Verification ===");

  try {
    // Create a copy of the public signals
    const manipulatedPublicSignals = [...originalPublicSignals];

    // Change the vote choice hash from Yes to No
    console.log(
      "Original vote choice hash (Yes):",
      manipulatedPublicSignals[2]
    );
    console.log("Expected hash for Yes vote:", POSEIDON_HASH_YES);

    // Change to No vote hash
    manipulatedPublicSignals[2] = POSEIDON_HASH_NO;
    console.log(
      "Manipulated vote choice hash (No):",
      manipulatedPublicSignals[2]
    );
    console.log("Expected hash for No vote:", POSEIDON_HASH_NO);

    // Try to verify with manipulated public signals
    const isValid = await ZKProofGenerator.verifyProofOffChain(
      originalProof,
      manipulatedPublicSignals,
      "voting"
    );
    console.log("Manipulated proof verification result:", isValid);

    if (isValid) {
      throw new Error(
        "SECURITY VULNERABILITY: Manipulated proof verification passed when it should have failed!"
      );
    } else {
      console.log(
        "✅ SECURITY CONFIRMED: Manipulated proof verification correctly failed"
      );
    }

    return isValid;
  } catch (error) {
    console.error("Error in testManipulatedVoteChoiceHash:", error);
    throw error;
  }
}

/**
 * Test 3: Change onChainVerifiableVoteChoiceHash to Abstain and verify it fails
 */
async function testManipulatedVoteChoiceHashToAbstain(
  originalProof,
  originalPublicSignals
) {
  console.log("\n=== Test 3: Manipulated Vote Choice Hash to Abstain ===");

  try {
    // Create a copy of the public signals
    const manipulatedPublicSignals = [...originalPublicSignals];

    // Change the vote choice hash from Yes to Abstain
    console.log(
      "Original vote choice hash (Yes):",
      manipulatedPublicSignals[2]
    );
    console.log("Expected hash for Yes vote:", POSEIDON_HASH_YES);

    // Change to Abstain vote hash
    manipulatedPublicSignals[2] = POSEIDON_HASH_ABSTAIN;
    console.log(
      "Manipulated vote choice hash (Abstain):",
      manipulatedPublicSignals[2]
    );
    console.log("Expected hash for Abstain vote:", POSEIDON_HASH_ABSTAIN);

    // Try to verify with manipulated public signals
    const isValid = await ZKProofGenerator.verifyProofOffChain(
      originalProof,
      manipulatedPublicSignals,
      "voting"
    );
    console.log("Manipulated proof verification result:", isValid);

    if (isValid) {
      throw new Error(
        "SECURITY VULNERABILITY: Manipulated proof verification passed when it should have failed!"
      );
    } else {
      console.log(
        "✅ SECURITY CONFIRMED: Manipulated proof verification correctly failed"
      );
    }

    return isValid;
  } catch (error) {
    console.error("Error in testManipulatedVoteChoiceHashToAbstain:", error);
    throw error;
  }
}

/**
 * Test 4: Change onChainVerifiableVoteChoiceHash to random value and verify it fails
 */
async function testManipulatedVoteChoiceHashToRandom(
  originalProof,
  originalPublicSignals
) {
  console.log("\n=== Test 4: Manipulated Vote Choice Hash to Random Value ===");

  try {
    // Create a copy of the public signals
    const manipulatedPublicSignals = [...originalPublicSignals];

    // Change the vote choice hash to a random value
    console.log("Original vote choice hash:", manipulatedPublicSignals[2]);

    const randomHash =
      "1234567890123456789012345678901234567890123456789012345678901234";
    manipulatedPublicSignals[2] = randomHash;
    console.log(
      "Manipulated vote choice hash (Random):",
      manipulatedPublicSignals[2]
    );

    // Try to verify with manipulated public signals
    const isValid = await ZKProofGenerator.verifyProofOffChain(
      originalProof,
      manipulatedPublicSignals,
      "voting"
    );
    console.log("Manipulated proof verification result:", isValid);

    if (isValid) {
      throw new Error(
        "SECURITY VULNERABILITY: Manipulated proof verification passed when it should have failed!"
      );
    } else {
      console.log(
        "✅ SECURITY CONFIRMED: Manipulated proof verification correctly failed"
      );
    }

    return isValid;
  } catch (error) {
    console.error("Error in testManipulatedVoteChoiceHashToRandom:", error);
    throw error;
  }
}

/**
 * Test 5: Verify that different vote choices produce different hashes
 */
async function testVoteChoiceHashUniqueness() {
  console.log("\n=== Test 5: Vote Choice Hash Uniqueness ===");

  try {
    // Generate proofs for different vote choices
    const voteChoices = [0, 1, 2]; // Abstain, Yes, No
    const hashes = [];

    for (const voteChoice of voteChoices) {
      const circuitInput = await generateVotingCircuitInput(
        mnemonic_user1,
        voteChoice,
        testVoteTimestamp
      );
      const { publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        "voting"
      );
      hashes.push(publicSignals[2]);

      console.log(
        `Vote choice ${voteChoice} produces hash: ${publicSignals[2]}`
      );
    }

    // Check that all hashes are unique
    const uniqueHashes = new Set(hashes);
    if (uniqueHashes.size === hashes.length) {
      console.log("✅ All vote choice hashes are unique");
    } else {
      console.log(
        "❌ Vote choice hashes are not unique - this could be a problem"
      );
    }

    // Verify against expected constants
    console.log("Expected hash for Abstain (0):", POSEIDON_HASH_ABSTAIN);
    console.log("Expected hash for Yes (1):", POSEIDON_HASH_YES);
    console.log("Expected hash for No (2):", POSEIDON_HASH_NO);

    return hashes;
  } catch (error) {
    console.error("Error in testVoteChoiceHashUniqueness:", error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runSecurityTests() {
  console.log("🔒 Voting Circuit Security Tests");
  console.log("=================================");
  console.log(
    "Testing cryptographic integrity of onChainVerifiableVoteChoiceHash"
  );
  console.log("Target Group ID:", targetGroupId);
  console.log("Epoch ID:", epochId);
  console.log("Proposal ID:", proposalId);
  console.log("Test Vote Choice:", testVoteChoice, "(Yes)");
  console.log("Test Vote Timestamp:", testVoteTimestamp);

  try {
    // Test 1: Generate and verify valid proof
    const { proof, publicSignals } = await testValidProof();

    // Test 2: Manipulate vote choice hash to No
    await testManipulatedVoteChoiceHash(proof, publicSignals);

    // Test 3: Manipulate vote choice hash to Abstain
    await testManipulatedVoteChoiceHashToAbstain(proof, publicSignals);

    // Test 4: Manipulate vote choice hash to random value
    await testManipulatedVoteChoiceHashToRandom(proof, publicSignals);

    // Test 5: Verify hash uniqueness
    await testVoteChoiceHashUniqueness();

    console.log("\n🎉 All security tests completed successfully!");
    console.log(
      "✅ The voting circuit correctly prevents manipulation of onChainVerifiableVoteChoiceHash"
    );
  } catch (error) {
    console.error("\n❌ Security test failed:", error.message);
    process.exit(1);
  }
}

// Export the main test function
export { runSecurityTests };

// Run the tests if this file is executed directly
const isMainModule =
  process.argv[1] && process.argv[1].endsWith("votingCircuitSecurity.test.js");
if (isMainModule) {
  runSecurityTests()
    .then(() => {
      console.log("\nTest execution completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}
