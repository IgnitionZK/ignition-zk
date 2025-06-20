const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Step 2: Deploying MembershipManager as UUPS Proxy...\n");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("");

  // Configuration - Update these addresses from previous steps
  const NFT_IMPLEMENTATION_ADDRESS =
    "0x8C49a9e2ED2c8e2AbA0D7B1Eead12C08bbd342C8"; // From Step 1
  const VERIFIER_ADDRESS = "0x8C3f64C4D2315842e40Fa281a0dF7411F1Caf13f";
  const GOVERNOR_PLACEHOLDER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";

  console.log("📋 Configuration:");
  console.log(`🔧 NFT Implementation: ${NFT_IMPLEMENTATION_ADDRESS}`);
  console.log(`🔐 Verifier: ${VERIFIER_ADDRESS}`);
  console.log(`👤 Governor Placeholder: ${GOVERNOR_PLACEHOLDER}`);
  console.log("");

  try {
    // Deploy MembershipManager as UUPS proxy
    console.log("📦 Deploying MembershipManager as UUPS proxy...");
    console.log("⏳ This may take a few minutes...");

    const MembershipManager = await ethers.getContractFactory(
      "MembershipManager"
    );

    // Get current gas price
    const gasPrice = await ethers.provider.getFeeData();
    console.log(
      `⛽ Current gas price: ${ethers.formatUnits(
        gasPrice.gasPrice,
        "gwei"
      )} gwei`
    );

    const membershipManager = await upgrades.deployProxy(
      MembershipManager,
      [VERIFIER_ADDRESS, GOVERNOR_PLACEHOLDER, NFT_IMPLEMENTATION_ADDRESS],
      {
        initializer: "initialize",
        kind: "uups",
        gasPrice: gasPrice.gasPrice,
        gasLimit: 8000000,
      }
    );

    console.log("⏳ Waiting for proxy deployment...");
    console.log(
      "📝 Transaction hash:",
      membershipManager.deploymentTransaction().hash
    );

    await membershipManager.waitForDeployment();
    const membershipManagerAddress = await membershipManager.getAddress();

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 2 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`👥 MembershipManager (Proxy): ${membershipManagerAddress}`);
    console.log("\n📋 Save this address for Step 3!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 2 failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }

    // Additional error information
    if (error.transaction) {
      console.error("Transaction details:", error.transaction);
    }
    if (error.receipt) {
      console.error("Transaction receipt:", error.receipt);
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
