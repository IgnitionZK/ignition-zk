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
    "0x8EdE77A2676F9A35D49923e25e4ADfaFCa9F1Ccf"; // From Step 1
  const PROPOSAL_VERIFIER_ADDRESS =
    "0xcF4eED1e78442d9d557B62008d1A7E53BE3B1b8c"; // From hardhat ignition deploy
  const PROPOSAL_CLAIM_VERIFIER_ADDRESS = "0xcF4eED1e78442d9d557B62008d1A7E53BE3B1b8c"; // From hardhat ignition deploy
  const GOVERNOR_PLACEHOLDER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";

  console.log("📋 Configuration:");
  console.log(`🔧 NFT Implementation: ${NFT_IMPLEMENTATION_ADDRESS}`);
  console.log(`🔐 Proposal Verifier: ${PROPOSAL_VERIFIER_ADDRESS}`);
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
      [
        GOVERNOR_PLACEHOLDER,
        NFT_IMPLEMENTATION_ADDRESS,
      ],
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

    // Deploy ProposalManager as UUPS proxy

    console.log("📦 Deploying ProposalManager as UUPS proxy...");
    console.log("⏳ This may take a few minutes...");

    const ProposalManager = await ethers.getContractFactory("ProposalManager");

    // Get current gas price
    const currGasPrice = await ethers.provider.getFeeData();
    console.log(
      `⛽ Current gas price: ${ethers.formatUnits(
        currGasPrice.gasPrice,
        "gwei"
      )} gwei`
    );

    const proposalManager = await upgrades.deployProxy(
      ProposalManager,
      [
        GOVERNOR_PLACEHOLDER,
        PROPOSAL_VERIFIER_ADDRESS,
        PROPOSAL_CLAIM_VERIFIER_ADDRESS
      ],
      {
        initializer: "initialize",
        kind: "uups",
        gasPrice: currGasPrice.gasPrice,
        gasLimit: 8000000,
      }
    );

    console.log("⏳ Waiting for proxy deployment...");
    console.log(
      "📝 Transaction hash:",
      proposalManager.deploymentTransaction().hash
    );

    await proposalManager.waitForDeployment();
    const proposalManagerAddress = await proposalManager.getAddress();
    console.log("📦 ProposalManager deployed at:", proposalManagerAddress);

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 2 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`👥 MembershipManager (Proxy): ${membershipManagerAddress}`);
    console.log(`📄 ProposalManager (Proxy): ${proposalManagerAddress}`);
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
