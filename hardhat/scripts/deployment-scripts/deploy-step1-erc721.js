const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Step 1: Deploying ERC721IgnitionZK Implementation...\n");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("");

  try {
    // Deploy ERC721IgnitionZK implementation (not a proxy)
    console.log("📦 Deploying ERC721IgnitionZK implementation...");
    const ERC721IgnitionZK = await ethers.getContractFactory(
      "ERC721IgnitionZK"
    );
    const nftImplementation = await ERC721IgnitionZK.deploy();

    console.log("⏳ Waiting for deployment...");
    await nftImplementation.waitForDeployment();
    const nftImplementationAddress = await nftImplementation.getAddress();

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 1 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(
      `🔧 ERC721IgnitionZK (Implementation): ${nftImplementationAddress}`
    );
    console.log("\n📋 Save this address for Step 2!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 1 failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
