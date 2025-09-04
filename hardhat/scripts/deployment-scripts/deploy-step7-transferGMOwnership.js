const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Step 7: Finalizing GovernanceManager Ownership...\n");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("");

  // Configuration - Update these addresses from previous steps
  const GOVERNANCE_MANAGER_ADDRESS = "0x364773751c69f6ED23f9C65Eec28Aa4444fc76fB"; // From Step 3
  const RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";
  const IGNITIONZK_MULTISIG = "0x5E42277e70102B6932727DA70f19Df8b6feD15E3";

  console.log("📋 Configuration:");
  console.log(`🏛️ GovernanceManager: ${GOVERNANCE_MANAGER_ADDRESS}`);
  console.log(`👤 Relayer: ${RELAYER}`);
  console.log(`👤 IgnitionZK Multisig: ${IGNITIONZK_MULTISIG}`);

  console.log("");

  // Validation check - ensure addresses are not zero addresses
  if (
    GOVERNANCE_MANAGER_ADDRESS === ethers.ZeroAddress
  ) {
    console.error("❌ Please ensure all addresses are properly set!");
    process.exit(1);
  }

  try {
    // Get contract instances
    const governanceManager = await ethers.getContractAt(
      "GovernanceManager",
      GOVERNANCE_MANAGER_ADDRESS
    );

    console.log(
      "🔧 Transferring GovernanceManager ownership to IgnitionZK Multisig..."
    );
    // Transfer MembershipManager ownership to GovernanceManager
    const transferTx = await governanceManager.transferOwnership(
      IGNITIONZK_MULTISIG
    );
    // Log the transaction hash
    console.log(`⏳ Waiting for ownership transfer... TX Hash: ${transferTx.hash}`);
    await transferTx.wait();

    console.log("✅ GovernanceManager ownership transferred to IgnitionZK Multisig!");

    console.log("\n🔧 Verifying setup...");
    // Verify ownership
    const governanceManagerOwner = await governanceManager.owner();
    console.log(`🏛️ GovernanceManager owner: ${governanceManagerOwner}`);

    if (
      governanceManagerOwner === IGNITIONZK_MULTISIG
    ) {
      console.log("✅ Ownership verification successful!");
    } else {
      console.error("❌ Ownership verification failed!");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Step 7 failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Ownership transfer failed:", error);
    process.exit(1);
  });
