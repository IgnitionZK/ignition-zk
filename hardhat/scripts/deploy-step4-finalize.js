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
    "0xCF5CA6bF90C299821e29CFcfAdA0C455cc19a3e5"; // From Step 2
  const PROPOSAL_MANAGER_ADDRESS = "0x3793D365defd9039c16e75025D3793f04aa46E53"; // From Step 2
  const VOTE_MANAGER_ADDRESS = "0x8Bc6CA09A18A0e43D561020C52AA93E8cB9C69D0"; // From Step 2 
  const GOVERNOR_ADDRESS = "0xfa2DA157db72EB1666a03019C1286eDFAF6cEa5c"; // From Step 3
  const OWNER_RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";
  const NFT_IMPLEMENTATION = "0x7C33a33561C0CFa6EECA18239A119d3FD3267B2A"; // From Step 1

  console.log("📋 Configuration:");
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`📄 ProposalManager: ${PROPOSAL_MANAGER_ADDRESS}`);
  console.log(`📄 VoteManager: ${VOTE_MANAGER_ADDRESS}`);
  console.log(`🏛️  Governor: ${GOVERNOR_ADDRESS}`);
  console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
  console.log("");

  // Validation check - ensure addresses are not zero addresses
  if (
    MEMBERSHIP_MANAGER_ADDRESS === ethers.ZeroAddress ||
    PROPOSAL_MANAGER_ADDRESS === ethers.ZeroAddress ||
    VOTE_MANAGER_ADDRESS === ethers.ZeroAddress ||
    GOVERNOR_ADDRESS === ethers.ZeroAddress
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
    const governor = await ethers.getContractAt(
      "GovernanceManager",
      GOVERNOR_ADDRESS
    );

    console.log(
      "🔧 Step 4a: Transferring MembershipManager ownership to Governor..."
    );
    // Transfer MembershipManager ownership to Governor
    const transferTx = await membershipManager.transferOwnership(
      GOVERNOR_ADDRESS
    );
    console.log("⏳ Waiting for ownership transfer...");
    await transferTx.wait();

    console.log("✅ MembershipManager ownership transferred to Governor!");

    // Transfer ownership of ProposalManager to Governor
    console.log(
      "🔧 Step 4b: Transferring ProposalManager ownership to Governor..."
    );
    const transferProposalManagerTx = await proposalManager.transferOwnership(
      GOVERNOR_ADDRESS
    );
    console.log("⏳ Waiting for ownership transfer...");
    await transferProposalManagerTx.wait();
    console.log("✅ ProposalManager ownership transferred to Governor!");

    // Transfer ownership of VoteManager to Governor
    console.log(
      "🔧 Step 4c: Transferring VoteManager ownership to Governor..."
    );
    const transferVoteManagerTx = await voteManager.transferOwnership(
      GOVERNOR_ADDRESS
    );
    console.log("⏳ Waiting for ownership transfer...");
    await transferVoteManagerTx.wait();
    console.log("✅ VoteManager ownership transferred to Governor!");

    console.log("\n🔧 Step 4d: Verifying setup...");
    // Verify ownership
    const membershipManagerOwner = await membershipManager.owner();
    const proposalManagerOwner = await proposalManager.owner();
    const voteManagerOwner = await voteManager.owner();
    const governorOwner = await governor.owner();

    console.log(`👥 MembershipManager owner: ${membershipManagerOwner}`);
    console.log(`📄 ProposalManager owner: ${proposalManagerOwner}`);
    console.log(`🗳️  VoteManager owner: ${voteManagerOwner}`);
    console.log(`🏛️  Governor owner: ${governorOwner}`);

    if (
      membershipManagerOwner === GOVERNOR_ADDRESS &&
      proposalManagerOwner === GOVERNOR_ADDRESS &&
      voteManagerOwner === GOVERNOR_ADDRESS &&
      governorOwner === OWNER_RELAYER
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
    console.log(`🗳️  VoteManager (Proxy): ${VOTE_MANAGER_ADDRESS}`);
    console.log(`🏛️  Governor (Proxy): ${GOVERNOR_ADDRESS}`);
    console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
    console.log("\n🔗 Contract Relationships:");
    console.log("• Governor owns MembershipManager");
    console.log("• Governor owns ProposalManager");
    console.log("• Governor owns VoteManager");
    console.log("• Owner/Relayer owns Governor");
    console.log("• MembershipManager can deploy group NFTs");
    console.log("• Governor can delegate calls to MembershipManager");
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
