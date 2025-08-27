const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Step 6: Deploying the FundingModules...\n");

  const GOVERNOR_ADDRESS = "0x66132e41BCEACb279c66525835602fD76900B417"; // From Step 3
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
    console.log("A: 📦 Deploying the GrantModule...\n");
    // Get Contract Factory
    const GrantModule = await ethers.getContractFactory("GrantModule");

    // Deploy the GrantModule UUPS Proxy (ERC‑1967) contract
    const grantModule = await upgrades.deployProxy(
        GrantModule,
        [
            GOVERNOR_ADDRESS
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    console.log("⏳ Waiting for GrantModule deployment...");
    await grantModule.waitForDeployment();
    console.log("✅ GrantModule deployed at:", grantModule.target);

    // Get GovernanceManager instance
    const governanceManager = await ethers.getContractAt("GovernanceManager", GOVERNOR_ADDRESS);

    // Set grant module address in GovernanceManager
    console.log("D: 💰 Setting GrantModule address in GovernanceManager...\n");
    await governanceManager.connect(deployer).addFundingModule(
        grantModule.target,
        ethers.id("grant")
    );
    console.log("✅ GrantModule address set in GovernanceManager");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 6 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`🏛️  Governor (Proxy): ${GOVERNOR_ADDRESS}`);
    console.log(`💰  GrantModule: ${grantModule.target}`);;
    console.log("\n📋 Save this addresses!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 6 failed:", error.message);
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
