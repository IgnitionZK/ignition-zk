import { ZkCredential } from "../generateCredentials-browser-safe.js";
import { ZKProofGenerator } from "../generateZKProof.js";

// Group ID: 81373f0e-8e13-4b8f-80fa-4e8f94821a1e
// Commitment values and group IDs extracted from DB: hashedLeaves.json
// SQL query: select commitment_value, group_id from ignitionzk.merkle_tree_leaves where is_active = true order by created_at;
const targetGroupId = "81373f0e-8e13-4b8f-80fa-4e8f94821a1e";

// User1 test1@mail.com
const mnemonic_user1 =
  "immune common syrup eight obscure include cake wagon night bid orange blind";
// User2 test2@mail.com
const mnemonic_user2 =
  "spare find poverty envelope boost fiscal black spare zero ticket legend point";
// User3 test3@mail.com
const mnemonic_user3 =
  "service nice lava heavy patient satisfy fresh run index never castle dream";

const users = [
  { user: "user1", mnemonic: mnemonic_user1 },
  { user: "user2", mnemonic: mnemonic_user2 },
  { user: "user3", mnemonic: mnemonic_user3 },
];

const commitmentArray = await ZKProofGenerator.filterLeavesByGroupId(
  "src/scripts/tests/hashedLeaves.json", // leaves JSON file
  targetGroupId // group ID to filter by
);
console.log(`Commitments for groupId ${targetGroupId}:`, commitmentArray);

async function testProof(mnemonic) {
  const circuitInput = await ZKProofGenerator.generateCircuitInput(
    mnemonic,
    commitmentArray,
    targetGroupId // external nullifier
  );
  const { proof, publicSignals } = await ZKProofGenerator.generateProof(
    circuitInput,
    "membership"
  );
  console.log("Generated proof:", proof);
  console.log("Public signals:", publicSignals);

  // internal test to check if public nullifier in the public Signals matches the expected public nullifier
  const publiNullifierTest = await ZkCredential.generatePublicNullifier(
    BigInt(circuitInput.identityNullifier),
    targetGroupId // external nullifier
  );

  if (publicSignals[0] !== publiNullifierTest.toString()) {
    throw new Error(
      "Public Nullifier in public signals does not match the expected public nullifier."
    );
  }
  console.log("Public Nullifier matches the expected value.");

  const isValidProof = await ZKProofGenerator.verifyProofOffChain(
    proof,
    publicSignals,
    "membership"
  );

  return isValidProof;
}

for (const user of users) {
  console.log(`\nTesting for ${user.user}...`);
  const isValidProof = await testProof(user.mnemonic);

  console.log(`Proof valid for ${user.user}:`, isValidProof);
}
process.exit(0);
