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
    "0xCd07Bf51Ccd58A3B43eF407ca771497DE7744672"; // From Step 2
  const GOVERNOR_ADDRESS = "0x62f8A5d3A2B578D46fdd8e9C02Ab0C30c2d9F9B9"; // From Step 3
  const OWNER_RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";

  console.log("📋 Configuration:");
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`🏛️  Governor: ${GOVERNOR_ADDRESS}`);
  console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
  console.log("");

  if (
    MEMBERSHIP_MANAGER_ADDRESS === "REPLACE_WITH_STEP2_ADDRESS" ||
    GOVERNOR_ADDRESS === "REPLACE_WITH_STEP3_ADDRESS"
  ) {
    console.error("❌ Please update the addresses from previous steps!");
    process.exit(1);
  }

  try {
    // Get contract instances
    const membershipManager = await ethers.getContractAt(
      "MembershipManager",
      MEMBERSHIP_MANAGER_ADDRESS
    );
    const governor = await ethers.getContractAt("Governor", GOVERNOR_ADDRESS);

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

    console.log("\n🔧 Step 4b: Verifying setup...");

    // Verify ownership
    const membershipManagerOwner = await membershipManager.owner();
    const governorOwner = await governor.owner();

    console.log(`👥 MembershipManager owner: ${membershipManagerOwner}`);
    console.log(`🏛️  Governor owner: ${governorOwner}`);

    if (
      membershipManagerOwner === GOVERNOR_ADDRESS &&
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
    console.log(
      `🔧 ERC721IgnitionZK (Implementation): 0x8C49a9e2ED2c8e2AbA0D7B1Eead12C08bbd342C8`
    );
    console.log(`👥 MembershipManager (Proxy): ${MEMBERSHIP_MANAGER_ADDRESS}`);
    console.log(`🏛️  Governor (Proxy): ${GOVERNOR_ADDRESS}`);
    console.log(`👤 Owner/Relayer: ${OWNER_RELAYER}`);
    console.log("\n🔗 Contract Relationships:");
    console.log("• Governor owns MembershipManager");
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
