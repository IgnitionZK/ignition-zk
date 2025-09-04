const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Step 3: Deploying GovernanceManager as UUPS Proxy...\n");

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
  const RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";

  console.log("📋 Configuration:");
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`📄 ProposalManager: ${PROPOSAL_MANAGER_ADDRESS}`);
  console.log(`📄 VoteManager: ${VOTE_MANAGER_ADDRESS}`);
  console.log(`👤 Relayer: ${RELAYER}`);
  console.log("");

  try {
    // Deploy GovernanceManager as UUPS proxy
    console.log("📦 Deploying GovernanceManager as UUPS proxy...");
    console.log("⏳ This may take a few minutes...");

    const GovernanceManager = await ethers.getContractFactory("GovernanceManager");
    const governanceManager = await upgrades.deployProxy(
      GovernanceManager,
      [
        RELAYER, // _initialOwner (temporary owner)
        RELAYER, // _relayer
        MEMBERSHIP_MANAGER_ADDRESS, // _membershipManager
        PROPOSAL_MANAGER_ADDRESS, // _proposalManager
        VOTE_MANAGER_ADDRESS, // _voteManager
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );

    console.log("⏳ Waiting for proxy deployment...");
    console.log(
      "📝 Transaction hash:",
      governanceManager.deploymentTransaction().hash
    );
    await governanceManager.waitForDeployment();
    const governanceManagerAddress = await governanceManager.getAddress();

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 3 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`🏛️  GovernanceManager (Proxy): ${governanceManagerAddress}`);
    console.log("\n📋 Save this address for Step 4!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 3 failed:", error.message);
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
