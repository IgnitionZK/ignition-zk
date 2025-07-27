import { ZkCredential } from "../generateCredentials-browser-safe.js";
import { ZKProofGenerator } from "./generateZKProof-nodejs-compatible.js";

console.log(process.cwd());

// Commitment values and group IDs extracted from DB: hashedLeaves.json
// SQL query: select commitment_value, group_id from ignitionzk.merkle_tree_leaves where is_active = true order by created_at;
const groupId = "21fae0f7-096f-4c8f-8515-93b9f247582d";
const epochId = "06134393-4412-4e46-9534-85186ea7bbe8";
const proposalId = "5b18c981-c040-4672-bf60-67e1301d3e27";
const proposalTitle = "Sonic Screwdriver Upgrade";
const proposalDescription = "Proposal to upgrade the Sonic Screwdriver to v42.0, adding quantum syncing, voice commands, and optional ice cream mode—keeping the Doctor stylishly overpowered across space and time.";
const proposalPayload = '{"value":"0","calldata":{"amount":"2","recipient":"0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"},"target_action":"delegateDistributeGrant","target_contract":"0xGovernanceContractAddress","target_function":"executeProposal"}';
const proposalFunding = '{"type":"lumpsum payment","amount":"2","currency":"ETH"}';
const proposalMetadata = '{"ipfs_cid":"QmTwui9718uxaUmyHasXDQ63RVoZKTQSnmRZfhGPRV1bzX"}';
const voteChoice = 1;

const mnemonic_user1 =
  "forward fiction concert during pencil man boy slice slab engage knife smoke";

const users = [
  { user: "test7@mail.com", mnemonic: mnemonic_user1 }
];

const commitmentArray = await ZKProofGenerator.filterLeavesByGroupId(
  "./hashedLeaves.json", // leaves JSON file
  groupId // group ID to filter by
);
console.log(`Commitments for groupId ${groupId}:`, commitmentArray);

for (const user of users) {
  console.log(`\nTesting for ${user.user}...`);
  console.log(`User mnemonic: ${user.mnemonic}`);

  ////////////////////////////////////////
  ///       MEMBERSHIP CIRCUIT          //
  ////////////////////////////////////////           

  const membershipCircuitInput = await ZKProofGenerator.generateMembershipCircuitInput(
    user.mnemonic,
    commitmentArray,
    groupId 
  );

  const { 
    proof: membeshipProof, 
    publicSignals:membershipPublicSignals 
  } = await ZKProofGenerator.generateProof(
    membershipCircuitInput,
    "membership"
  );

  const {
    proofSolidity: membershipProofSolidity, 
    publicSignalsSolidity: membershipPublicSignalsSolidity 
  } = await ZKProofGenerator.generateSolidityCalldata(membeshipProof, membershipPublicSignals);

  console.log("Membership Solidity proof: ", membershipProofSolidity);
  console.log("Membership Solidity publicSignals: ", membershipPublicSignalsSolidity);

  const isValidMembershipProof = await ZKProofGenerator.verifyProofOffChain(
    membeshipProof,
    membershipPublicSignals,
    "membership"
  );
  console.log(`Is proof valid for ${user.user} and membership circuit:`, isValidMembershipProof);

  ////////////////////////////////////////
  ///       PROPOSAL CIRCUIT           ///
  ////////////////////////////////////////       

  const proposalCircuitInput = await ZKProofGenerator.generateProposalCircuitInput(
    user.mnemonic,
    commitmentArray,
    groupId,
    epochId,
    proposalTitle,
    proposalDescription,
    proposalPayload,
    proposalFunding,
    proposalMetadata
  );

  const { 
    proof: proposalProof, 
    publicSignals:proposalPublicSignals 
  } = await ZKProofGenerator.generateProof(
    proposalCircuitInput,
    "proposal"
  );

  const {
    proofSolidity: proposalProofSolidity, 
    publicSignalsSolidity: proposalPublicSignalsSolidity 
  } = await ZKProofGenerator.generateSolidityCalldata(proposalProof, proposalPublicSignals);

  console.log("Proposal Solidity proof: ", proposalProofSolidity);
  console.log("Proposal Solidity publicSignals: ", proposalPublicSignalsSolidity);

  const isValidProposalProof = await ZKProofGenerator.verifyProofOffChain(
    proposalProof,
    proposalPublicSignals,
    "proposal"
  );
  console.log(`Is proof valid for ${user.user} and proposal circuit:`, isValidProposalProof);

  ////////////////////////////////////////
  ///       PROPOSAL CLAIM CIRCUIT     ///
  ////////////////////////////////////////       
  
  const proposalContextHashTest = proposalPublicSignals[0];
   console.log("testing proposalContextHash: ", proposalContextHashTest);
  const proposalSubmissionHash = proposalPublicSignals[1];
  console.log("proposalSubmissionHash: ", proposalSubmissionHash);
  const proposalClaimHash = proposalPublicSignals[2];
  console.log("proposalClaimHash: ", proposalClaimHash);
  

  const proposalClaimCircuitInput =  await ZKProofGenerator.generateProposalClaimCircuitInput(
        user.mnemonic,
        commitmentArray,
        groupId,
        epochId,
        proposalClaimHash,
        proposalSubmissionHash
      );

  const { 
    proof: proposalClaimProof, 
    publicSignals:proposalClaimPublicSignals 
  } = await ZKProofGenerator.generateProof(
    proposalClaimCircuitInput,
    "proposal-claim"
  );

  const {
    proofSolidity: proposalClaimProofSolidity, 
    publicSignalsSolidity: proposalClaimPublicSignalsSolidity 
  } = await ZKProofGenerator.generateSolidityCalldata(proposalClaimProof, proposalClaimPublicSignals);

  console.log("Proposal Claim Solidity proof: ", proposalClaimProofSolidity);
  console.log("Proposal Claim Solidity publicSignals: ", proposalClaimPublicSignalsSolidity);

  const isValidProposalClaimProof = await ZKProofGenerator.verifyProofOffChain(
    proposalClaimProof,
    proposalClaimPublicSignals,
    "proposal-claim"
  );
  console.log(`Is proof valid for ${user.user} and proposal claim circuit:`, isValidProposalClaimProof);

  
  ////////////////////////////////////////
  ///       VOTE CIRCUIT               ///
  ////////////////////////////////////////       

  const voteCircuitInput = await ZKProofGenerator.generateVoteCircuitInput(
    user.mnemonic, 
    commitmentArray,
    groupId,
    epochId,
    proposalId,
    voteChoice
  );

  const { 
    proof: voteProof, 
    publicSignals:votePublicSignals 
  } = await ZKProofGenerator.generateProof(
    voteCircuitInput,
    "vote"
  );

  const {
    proofSolidity: voteProofSolidity, 
    publicSignalsSolidity: votePublicSignalsSolidity 
  } = await ZKProofGenerator.generateSolidityCalldata(voteProof, votePublicSignals);

  console.log("Vote Solidity proof: ", voteProofSolidity);
  console.log("Vote Solidity publicSignals: ", votePublicSignalsSolidity);

  const isValidVoteProof = await ZKProofGenerator.verifyProofOffChain(
    voteProof,
    votePublicSignals,
    "vote"
  );
  console.log(`Is proof valid for ${user.user} and vote circuit:`, isValidVoteProof);
}

process.exit(0);
