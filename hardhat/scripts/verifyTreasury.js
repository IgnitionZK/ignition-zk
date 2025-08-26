const { ethers } = require("hardhat");

/**
 * Treasury Verification Script for Sepolia Network
 *
 * Before running this script, make sure to:
 * 1. Set your SEPOLIA_RPC_URL environment variable:
 *    export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
 *
 * 2. Or update the fallback URL below with your own Infura/Alchemy endpoint
 *
 * Run with: npx hardhat run scripts/verifyTreasury.js --network sepolia
 */

async function main() {
  console.log("🔍 Verifying Treasury Deployment on Sepolia...\n");

  // Connect to Sepolia network
  const sepoliaProvider = new ethers.JsonRpcProvider(
    process.env.ALCHEMY_SEPOLIA_URL ||
      "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
  );

  // Check network connection
  try {
    const network = await sepoliaProvider.getNetwork();
    console.log(
      "🌐 Connected to network:",
      network.name,
      "(Chain ID:",
      network.chainId,
      ")"
    );
    if (network.chainId !== 11155111n) {
      // Sepolia chain ID
      console.log(
        "⚠️ Warning: Not connected to Sepolia mainnet (expected Chain ID: 11155111)"
      );
    }
  } catch (error) {
    console.log("⚠️ Could not verify network, continuing...");
  }
  console.log();

  // Configuration
  const DEPLOYED_TREASURY_ADDRESS =
    "0x1F0574427E817EDD3D2508d7581eD99e35C064aB";
  const EXPECTED_ADMIN_ADDRESS = "0xda3Ae3DF0AE560A4094E91935227750BC4Fb00ed";
  const GOVERNANCE_MANAGER_ADDRESS =
    "0x7ab21Db27Cb94944C5316aE93dA4AA796d673c8a";
  const EMERGENCY_RECOVERY_ADDRESS =
    "0xDbE03d74F7531A51dAf27D99f9faD4e8090F4633";

  try {
    // 1. Check if the address is a deployed contract
    console.log("1️⃣ Checking if address is a deployed contract...");
    const code = await sepoliaProvider.getCode(DEPLOYED_TREASURY_ADDRESS);
    if (code === "0x") {
      throw new Error("Address is not a deployed contract");
    }
    console.log("✅ Address is a deployed contract\n");

    // 2. Try to create a TreasuryManager instance
    console.log("2️⃣ Verifying contract interface...");
    const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
    const treasury = TreasuryManager.attach(DEPLOYED_TREASURY_ADDRESS).connect(
      sepoliaProvider
    );
    console.log("✅ TreasuryManager interface created\n");

    // 3. Check the DEFAULT_ADMIN_ROLE
    console.log("3️⃣ Verifying DEFAULT_ADMIN_ROLE assignment...");
    const hasAdminRole = await treasury.hasRole(
      ethers.ZeroHash,
      EXPECTED_ADMIN_ADDRESS
    );
    if (hasAdminRole) {
      console.log(
        "✅ DEFAULT_ADMIN_ROLE is correctly assigned to:",
        EXPECTED_ADMIN_ADDRESS
      );
    } else {
      console.log(
        "❌ DEFAULT_ADMIN_ROLE is NOT assigned to:",
        EXPECTED_ADMIN_ADDRESS
      );
    }
    console.log();

    // 4. Check the GOVERNANCE_MANAGER_ROLE and EMERGENCY_RECOVERY_ROLE
    console.log("4️⃣ Verifying role assignments...");
    const GOVERNANCE_MANAGER_ROLE = ethers.keccak256(
      ethers.toUtf8Bytes("GOVERNANCE_MANAGER_ROLE")
    );

    const EMERGENCY_RECOVERY_ROLE = ethers.keccak256(
      ethers.toUtf8Bytes("EMERGENCY_RECOVERY_ROLE")
    );

    // Test other AccessControl functions to see what's available
    console.log("   Testing AccessControl functions...");
    try {
      const roleAdmin = await treasury.getRoleAdmin(ethers.ZeroHash);
      console.log("   ✅ getRoleAdmin(DEFAULT_ADMIN_ROLE):", roleAdmin);
    } catch (error) {
      console.log("   ❌ getRoleAdmin failed:", error.message);
    }

    try {
      const roleMemberCount = await treasury.getRoleMemberCount(
        ethers.ZeroHash
      );
      console.log(
        "   ✅ getRoleMemberCount(DEFAULT_ADMIN_ROLE):",
        roleMemberCount.toString()
      );
    } catch (error) {
      console.log("   ❌ getRoleMemberCount failed:", error.message);
    }

    // Check GOVERNANCE_MANAGER_ROLE assignment
    console.log("   Checking GOVERNANCE_MANAGER_ROLE...");
    try {
      const GOVERNANCE_MANAGER_ADDRESS =
        "0x7ab21Db27Cb94944C5316aE93dA4AA796d673c8a";
      const hasGovernanceRole = await treasury.hasRole(
        GOVERNANCE_MANAGER_ROLE,
        GOVERNANCE_MANAGER_ADDRESS
      );

      if (hasGovernanceRole) {
        console.log(
          "   ✅ GOVERNANCE_MANAGER_ROLE is correctly assigned to:",
          GOVERNANCE_MANAGER_ADDRESS
        );
      } else {
        console.log(
          "   ❌ GOVERNANCE_MANAGER_ROLE is NOT assigned to:",
          GOVERNANCE_MANAGER_ADDRESS
        );
      }

      const EMERGENCY_RECOVERY_ADDRESS =
        "0xDbE03d74F7531A51dAf27D99f9faD4e8090F4633";
      const hasEmergencyRole = await treasury.hasRole(
        EMERGENCY_RECOVERY_ROLE,
        EMERGENCY_RECOVERY_ADDRESS
      );

      if (hasEmergencyRole) {
        console.log(
          "   ✅ EMERGENCY_RECOVERY_ROLE is correctly assigned to:",
          EMERGENCY_RECOVERY_ADDRESS
        );
      } else {
        console.log(
          "   ❌ EMERGENCY_RECOVERY_ROLE is NOT assigned to:",
          EMERGENCY_RECOVERY_ADDRESS
        );
      }

      console.log("   ✅ Role verification completed for both roles");
    } catch (error) {
      console.log("❌ Role verification failed:", error.message);
    }
    console.log();

    // 5. Check contract version and state
    console.log("5️⃣ Checking contract state...");
    try {
      const version = await treasury.version();
      console.log("   Contract Version:", version);
    } catch (error) {
      console.log("   ❌ Could not get version:", error.message);
    }

    try {
      const isLocked = await treasury.isTreasuryLocked();
      console.log("   Treasury Locked:", isLocked);
    } catch (error) {
      console.log("   ❌ Could not get locked state:", error.message);
    }

    try {
      const balance = await sepoliaProvider.getBalance(
        DEPLOYED_TREASURY_ADDRESS
      );
      console.log("   ETH Balance:", ethers.formatEther(balance), "ETH");
    } catch (error) {
      console.log("   ❌ Could not get balance:", error.message);
    }
    console.log();

    // 6. Summary
    console.log("📋 Verification Summary:");
    console.log("========================");
    console.log("Contract Address:", DEPLOYED_TREASURY_ADDRESS);
    console.log("Expected Admin:", EXPECTED_ADMIN_ADDRESS);
    console.log("Admin Role Assigned:", hasAdminRole ? "✅ YES" : "❌ NO");

    // Add role verification results to summary
    try {
      const hasGovernanceRole = await treasury.hasRole(
        GOVERNANCE_MANAGER_ROLE,
        GOVERNANCE_MANAGER_ADDRESS
      );
      const hasEmergencyRole = await treasury.hasRole(
        EMERGENCY_RECOVERY_ROLE,
        EMERGENCY_RECOVERY_ADDRESS
      );

      console.log(
        "Governance Manager Role:",
        hasGovernanceRole ? "✅ YES" : "❌ NO"
      );
      console.log(
        "Emergency Recovery Role:",
        hasEmergencyRole ? "✅ YES" : "❌ NO"
      );
    } catch (error) {
      console.log("Could not verify additional roles in summary");
    }

    if (hasAdminRole) {
      console.log("\n🎉 Treasury verification PASSED!");
      console.log(
        "The deployed treasury contract is valid and has the correct DEFAULT_ADMIN_ROLE."
      );
    } else {
      console.log("\n⚠️ Treasury verification FAILED!");
      console.log(
        "The deployed treasury contract exists but does not have the expected DEFAULT_ADMIN_ROLE."
      );
      console.log("This could indicate:");
      console.log("- The treasury was not properly initialized");
      console.log("- The wrong address was used during deployment");
      console.log("- The role assignment failed");
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
}

// Run the verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script execution failed:", error);
    process.exit(1);
  });
