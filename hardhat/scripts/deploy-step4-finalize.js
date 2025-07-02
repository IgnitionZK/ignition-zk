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
    "0x6c318efd89167e2e41a2eb6d7ba95a19Ff940E9C"; // From Step 2
  const PROPOSAL_MANAGER_ADDRESS = "0xFaE6fB40D61ff061AE3d5223747f4Dd5b0037d0E"; // From Step 2
  const GOVERNOR_ADDRESS = "0xf97C58b540427b0319982fbcDfc1242fDaa14c3F"; // From Step 3
  const OWNER_RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";
  const NFT_IMPLEMENTATION = "0x8EdE77A2676F9A35D49923e25e4ADfaFCa9F1Ccf"; // From Step 1

  console.log("📋 Configuration:");
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`📄 ProposalManager: ${PROPOSAL_MANAGER_ADDRESS}`);
  console.log(`🏛️  Governor: ${GOVERNOR_ADDRESS}`);
  console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
  console.log("");

  // Validation check - ensure addresses are not zero addresses
  if (
    MEMBERSHIP_MANAGER_ADDRESS === ethers.ZeroAddress ||
    PROPOSAL_MANAGER_ADDRESS === ethers.ZeroAddress ||
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

    console.log("\n🔧 Step 4c: Verifying setup...");
    // Verify ownership
    const membershipManagerOwner = await membershipManager.owner();
    const proposalManagerOwner = await proposalManager.owner();
    const governorOwner = await governor.owner();

    console.log(`👥 MembershipManager owner: ${membershipManagerOwner}`);
    console.log(`📄 ProposalManager owner: ${proposalManagerOwner}`);
    console.log(`🏛️  Governor owner: ${governorOwner}`);

    if (
      membershipManagerOwner === GOVERNOR_ADDRESS &&
      proposalManagerOwner === GOVERNOR_ADDRESS &&
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
    console.log(`🏛️  Governor (Proxy): ${GOVERNOR_ADDRESS}`);
    console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
    console.log("\n🔗 Contract Relationships:");
    console.log("• Governor owns MembershipManager");
    console.log("• Governor owns ProposalManager");
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
