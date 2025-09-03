const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Step 4: Finalizing Deployment & Setting Up Ownership...\n");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("");

  // Configuration - Update these addresses from previous steps
  const MEMBERSHIP_MANAGER_ADDRESS =
    "0x6057397CDc44eEb0c7996b90AB8DA9d16751b0C0"; // From Step 2
  const PROPOSAL_MANAGER_ADDRESS = "0xd43C76D7Abba3025A6106755655Bdb3ed8CcCD5c"; // From Step 2
  const VOTE_MANAGER_ADDRESS = "0x786A314A1902e714e2994D6Fc90ee871B2473CCF"; // From Step 2 
  const GOVERNANCE_MANAGER_ADDRESS = "0x364773751c69f6ED23f9C65Eec28Aa4444fc76fB"; // From Step 3
  const RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";
  const NFT_IMPLEMENTATION = "0x7C33a33561C0CFa6EECA18239A119d3FD3267B2A"; // From Step 1

  console.log("📋 Configuration:");
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`📄 ProposalManager: ${PROPOSAL_MANAGER_ADDRESS}`);
  console.log(`📄 VoteManager: ${VOTE_MANAGER_ADDRESS}`);
  console.log(`🏛️ GovernanceManager: ${GOVERNANCE_MANAGER_ADDRESS}`);
  console.log(`👤 Relayer: ${RELAYER}`);

  console.log("");

  // Validation check - ensure addresses are not zero addresses
  if (
    MEMBERSHIP_MANAGER_ADDRESS === ethers.ZeroAddress ||
    PROPOSAL_MANAGER_ADDRESS === ethers.ZeroAddress ||
    VOTE_MANAGER_ADDRESS === ethers.ZeroAddress ||
    GOVERNANCE_MANAGER_ADDRESS === ethers.ZeroAddress
  ) {
    console.error("❌ Please ensure all addresses are properly set!");
    process.exit(1);
  }

  try {
    // Get contract instances
    const membershipManager = await ethers.getContractAt(
      "MembershipManager",
      MEMBERSHIP_MANAGER_ADDRESS
    );
    const proposalManager = await ethers.getContractAt(
      "ProposalManager",
      PROPOSAL_MANAGER_ADDRESS
    );
    const voteManager = await ethers.getContractAt(
      "VoteManager",
      VOTE_MANAGER_ADDRESS
    );
    const governanceManager = await ethers.getContractAt(
      "GovernanceManager",
      GOVERNANCE_MANAGER_ADDRESS
    );

    console.log(
      "🔧 Step 4a: Transferring MembershipManager ownership to GovernanceManager..."
    );
    // Transfer MembershipManager ownership to GovernanceManager
    const transferTx = await membershipManager.transferOwnership(
      GOVERNANCE_MANAGER_ADDRESS
    );
    console.log(`⏳ Waiting for ownership transfer... TX Hash: ${transferTx.hash}`);
    await transferTx.wait();

    console.log("✅ MembershipManager ownership transferred to GovernanceManager!");

    // Transfer ownership of ProposalManager to GovernanceManager
    console.log(
      "🔧 Step 4b: Transferring ProposalManager ownership to GovernanceManager..."
    );
    const transferProposalManagerTx = await proposalManager.transferOwnership(
      GOVERNANCE_MANAGER_ADDRESS
    );
    console.log(`⏳ Waiting for ownership transfer... TX Hash: ${transferProposalManagerTx.hash}`);
    await transferProposalManagerTx.wait();
    console.log("✅ ProposalManager ownership transferred to GovernanceManager!");

    // Transfer ownership of VoteManager to GovernanceManager
    console.log(
      "🔧 Step 4c: Transferring VoteManager ownership to GovernanceManager..."
    );
    const transferVoteManagerTx = await voteManager.transferOwnership(
      GOVERNANCE_MANAGER_ADDRESS
    );
    console.log(`⏳ Waiting for ownership transfer... TX Hash: ${transferVoteManagerTx.hash}`);
    await transferVoteManagerTx.wait();
    console.log("✅ VoteManager ownership transferred to GovernanceManager!");

    console.log("\n🔧 Step 4d: Verifying setup...");
    // Verify ownership
    const membershipManagerOwner = await membershipManager.owner();
    const proposalManagerOwner = await proposalManager.owner();
    const voteManagerOwner = await voteManager.owner();
    const governanceManagerOwner = await governanceManager.owner();

    console.log(`👥 MembershipManager owner: ${membershipManagerOwner}`);
    console.log(`📄 ProposalManager owner: ${proposalManagerOwner}`);
    console.log(`🗳️ VoteManager owner: ${voteManagerOwner}`);
    console.log(`🏛️ GovernanceManager owner: ${governanceManagerOwner}`);

    if (
      membershipManagerOwner === GOVERNANCE_MANAGER_ADDRESS &&
      proposalManagerOwner === GOVERNANCE_MANAGER_ADDRESS &&
      voteManagerOwner === GOVERNANCE_MANAGER_ADDRESS &&
      governanceManagerOwner === RELAYER
    ) {
      console.log("✅ Ownership verification successful!");
    } else {
      console.error("❌ Ownership verification failed!");
      process.exit(1);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("📋 Final Contract Addresses:");
    console.log(`🔧 ERC721IgnitionZK (Implementation): ${NFT_IMPLEMENTATION}`);
    console.log(`👥 MembershipManager (Proxy): ${MEMBERSHIP_MANAGER_ADDRESS}`);
    console.log(`📄 ProposalManager (Proxy): ${PROPOSAL_MANAGER_ADDRESS}`);
    console.log(`🗳️ VoteManager (Proxy): ${VOTE_MANAGER_ADDRESS}`);
    console.log(`🏛️ GovernanceManager (Proxy): ${GOVERNANCE_MANAGER_ADDRESS}`);
    console.log(`👤 Relayer: ${RELAYER}`);
    console.log("\n🔗 Contract Relationships:");
    console.log("• GovernanceManager owns MembershipManager");
    console.log("• GovernanceManager owns ProposalManager");
    console.log("• GovernanceManager owns VoteManager");
    console.log("• Relayer temporarily owns GovernanceManager");
    console.log("• MembershipManager can deploy group NFTs");
    console.log("• GovernanceManager can delegate calls to Manager contracts");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 4 failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
