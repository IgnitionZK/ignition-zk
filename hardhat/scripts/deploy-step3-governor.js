const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Step 3: Deploying Governor as UUPS Proxy...\n");

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
    "0x307b3eeF7A6E74CFa56b1C551F9B0B4A2A635AfD"; // From Step 2
  const PROPOSAL_MANAGER_ADDRESS = "0xC54832346f6A242E61846f719f083758A19973f0"; // From Step 2
  const OWNER_RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";

  console.log("📋 Configuration:");
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`📄 ProposalManager: ${PROPOSAL_MANAGER_ADDRESS}`);
  console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
  console.log("");

  try {
    // Deploy Governor as UUPS proxy
    console.log("📦 Deploying Governor as UUPS proxy...");
    console.log("⏳ This may take a few minutes...");

    const Governor = await ethers.getContractFactory("GovernanceManager");
    const governor = await upgrades.deployProxy(
      Governor,
      [
        OWNER_RELAYER, // _initialOwner
        OWNER_RELAYER, // _relayer
        MEMBERSHIP_MANAGER_ADDRESS, // _membershipManager
        PROPOSAL_MANAGER_ADDRESS, // _proposalManager
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );

    console.log("⏳ Waiting for proxy deployment...");
    await governor.waitForDeployment();
    const governorAddress = await governor.getAddress();

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 3 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`🏛️  Governor (Proxy): ${governorAddress}`);
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
