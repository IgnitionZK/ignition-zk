const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Step 5: Treasury Contracts...\n");

  const MEMBERSHIP_MANAGER_ADDRESS = "0x8370E9d59a97Ad443F9a1E1e628f9932639fD3fb"; // From Step 2
  const GOVERNOR_ADDRESS = "0x7ab21Db27Cb94944C5316aE93dA4AA796d673c8a"; // From Step 3
  const OWNER_RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";
  
  console.log("📋 Configuration:");
  console.log(`📄 GovernanceManager: ${GOVERNOR_ADDRESS}`);
  console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
  console.log("");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("");
  
  try {
    
    console.log("A: 📦 Deploying the TreasuryManager without initialization...\n");
    
    // Get Contract Factory
    const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
    // Deploy TreasuryManager without initialization
    const treasuryManager = await TreasuryManager.deploy();
    
    console.log("⏳ Waiting for TreasuryManager deployment...");
    await treasuryManager.waitForDeployment();
    console.log("✅ TreasuryManager deployed at:", treasuryManager.target);
    
    console.log("B: 📦 Deploying the BeaconManager...\n");
    // Get Contract Factory
    const BeaconManager = await ethers.getContractFactory("BeaconManager");
    
    // Deploy BeaconManager with the TreasuryManager implementation address and temp owner
    const beaconManager = await BeaconManager.deploy(
        treasuryManager.target,
        OWNER_RELAYER // Temporary owner during development
    );

    console.log("⏳ Waiting for BeaconManager deployment...");
    await beaconManager.waitForDeployment();
    console.log("✅ BeaconManager deployed at:", beaconManager.target);

    
    console.log("C: 📦 Deploying the TreasuryFactory...\n");
    // Get Contract Factory
    const TreasuryFactory = await ethers.getContractFactory("TreasuryFactory");

    const treasuryFactory = await TreasuryFactory.deploy(
        beaconManager.target,
        GOVERNOR_ADDRESS, // GovernanceManager address
        MEMBERSHIP_MANAGER_ADDRESS
    );
    console.log("⏳ Waiting for TreasuryFactory deployment...");
    await treasuryFactory.waitForDeployment();
    console.log("✅ TreasuryFactory deployed at:", treasuryFactory.target);

    // Set TreasuryFactory address in GovernanceManager
    console.log("D: 🏭 Setting TreasuryFactory address in GovernanceManager...\n");
    const governanceManager = await ethers.getContractAt("GovernanceManager", GOVERNOR_ADDRESS);
    await governanceManager.connect(deployer).setTreasuryFactory(treasuryFactory.target);
    console.log("✅ TreasuryFactory address set in GovernanceManager");

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 5 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`🏛️  Governor (Proxy): ${GOVERNOR_ADDRESS}`);
    console.log(`💰  TreasuryManager: ${treasuryManager.target}`);
    console.log(`🔦  BeaconManager: ${beaconManager.target}`);
    console.log(`🏭  TreasuryFactory: ${treasuryFactory.target}`);
    console.log("\n📋 Save these addresses for Step 6!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 5 failed:", error.message);
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
