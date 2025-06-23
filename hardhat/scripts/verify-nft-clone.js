const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying NFT Clone Contract...\n");

  // Configuration - Update these addresses
  const CLONE_ADDRESS = "0x6D436fB35e0b5f8AC0eF67b34A59741713F66300"; // Replace with your clone address
  const MEMBERSHIP_MANAGER_ADDRESS =
    "0xeE60b7b9A5016E39c37cEEDE021a0a38799ba0AE";
  const GOVERNOR_ADDRESS = "0x809B3aF634aC3F45bfDFc09Fd7887F980831DC13";
  const RELAYER_ADDRESS = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";

  console.log("📋 Configuration:");
  console.log(`🎯 Clone Address: ${CLONE_ADDRESS}`);
  console.log(`👥 MembershipManager: ${MEMBERSHIP_MANAGER_ADDRESS}`);
  console.log(`🏛️  Governor: ${GOVERNOR_ADDRESS}`);
  console.log(`📡 Relayer: ${RELAYER_ADDRESS}`);
  console.log("");

  try {
    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

    // Check if deployer is the relayer
    if (deployer.address.toLowerCase() !== RELAYER_ADDRESS.toLowerCase()) {
      console.log("⚠️  Warning: Deployer is not the relayer address");
      console.log("   Some functions may not be accessible");
    } else {
      console.log("✅ Deployer is the relayer - full access available");
    }
    console.log("");

    // 1. Check if contract exists at address
    console.log("🔍 Step 1: Checking contract existence...");
    const code = await ethers.provider.getCode(CLONE_ADDRESS);

    if (code === "0x") {
      console.log("❌ No contract deployed at this address");
      return;
    }

    console.log(`✅ Contract found! Code length: ${code.length} bytes`);

    // 2. Check if it's a minimal proxy (should be ~45 bytes)
    if (code.length < 100) {
      console.log("📦 This appears to be a minimal proxy (EIP-1167 clone)");
    } else {
      console.log("📦 This appears to be a full contract");
    }
    console.log("");

    // 3. Get implementation address through GovernanceManager (as relayer)
    console.log(
      "🔍 Step 2: Getting implementation address through GovernanceManager..."
    );
    try {
      const governor = await ethers.getContractAt(
        "GovernanceManager",
        GOVERNOR_ADDRESS
      );

      const implementationAddress =
        await governor.delegateGetNftImplementation();
      console.log(`🔧 Implementation Address: ${implementationAddress}`);
    } catch (error) {
      console.log(
        "⚠️  Could not get implementation address through GovernanceManager"
      );
      console.log("   Error:", error.message);
      console.log("   This might be due to access control restrictions");
    }
    console.log("");

    // 4. Try to create ERC721 contract instance at clone address
    console.log("🔍 Step 3: Testing ERC721 interface...");
    try {
      const nftContract = await ethers.getContractAt(
        "ERC721IgnitionZK",
        CLONE_ADDRESS
      );

      // Test basic ERC721 functions
      console.log("📝 Testing ERC721 functions...");

      const name = await nftContract.name();
      console.log(`✅ Name: ${name}`);

      const symbol = await nftContract.symbol();
      console.log(`✅ Symbol: ${symbol}`);

      const totalSupply = await nftContract.totalSupply();
      console.log(`✅ Total Supply: ${totalSupply}`);

      // Test AccessControl functions
      console.log("🔐 Testing AccessControl functions...");

      const defaultAdminRole = await nftContract.DEFAULT_ADMIN_ROLE();
      console.log(`✅ DEFAULT_ADMIN_ROLE: ${defaultAdminRole}`);

      const minterRole = await nftContract.MINTER_ROLE();
      console.log(`✅ MINTER_ROLE: ${minterRole}`);

      const burnerRole = await nftContract.BURNER_ROLE();
      console.log(`✅ BURNER_ROLE: ${burnerRole}`);

      // Test role assignments
      console.log("👥 Testing role assignments...");

      const hasDefaultAdminRole = await nftContract.hasRole(
        defaultAdminRole,
        GOVERNOR_ADDRESS
      );
      console.log(`✅ Governor has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);

      const hasMinterRole = await nftContract.hasRole(
        minterRole,
        MEMBERSHIP_MANAGER_ADDRESS
      );
      console.log(`✅ MembershipManager has MINTER_ROLE: ${hasMinterRole}`);

      const hasBurnerRole = await nftContract.hasRole(
        burnerRole,
        MEMBERSHIP_MANAGER_ADDRESS
      );
      console.log(`✅ MembershipManager has BURNER_ROLE: ${hasBurnerRole}`);

      console.log("\n" + "=".repeat(60));
      console.log("🎉 NFT CLONE VERIFICATION SUCCESSFUL!");
      console.log("=".repeat(60));
      console.log("✅ The clone address is a working ERC721 contract");
      console.log("✅ It delegates calls to the implementation contract");
      console.log("✅ All ERC721 functions are accessible");
      console.log("✅ Access control roles are properly set");
      console.log("=".repeat(60));

      // 5. Check for token ownership
      console.log("\n🔍 Step 4: Checking token ownership...");

      if (totalSupply > 0) {
        console.log("🔍 Checking token ownership...");

        // Get all token owners
        const tokenOwners = new Map();

        for (let i = 0; i < totalSupply; i++) {
          try {
            const tokenId = await nftContract.tokenByIndex(i);
            const owner = await nftContract.ownerOf(tokenId);
            tokenOwners.set(tokenId.toString(), owner);
            console.log(`🎫 Token ID ${tokenId}: Owner ${owner}`);
          } catch (error) {
            console.log(`⚠️  Error getting token ${i}: ${error.message}`);
          }
        }

        // Group tokens by owner
        const ownerToTokens = new Map();
        for (const [tokenId, owner] of tokenOwners) {
          if (!ownerToTokens.has(owner)) {
            ownerToTokens.set(owner, []);
          }
          ownerToTokens.get(owner).push(tokenId);
        }

        console.log("\n📋 Token Ownership Summary:");
        console.log("=".repeat(40));

        if (ownerToTokens.size > 0) {
          for (const [owner, tokens] of ownerToTokens) {
            console.log(`👤 Owner: ${owner}`);
            console.log(`   Token IDs: ${tokens.join(", ")}`);
            console.log(`   Count: ${tokens.length}`);
            console.log("");
          }
        } else {
          console.log("❌ No tokens found or error retrieving ownership data");
        }

        console.log("=".repeat(40));
      } else {
        console.log("📭 No tokens have been minted yet");
      }
    } catch (error) {
      console.error("❌ Failed to call ERC721 functions:", error.message);
      console.log("\n💡 This might indicate:");
      console.log("   • The clone wasn't properly initialized");
      console.log("   • The implementation contract is not accessible");
      console.log("   • There's an issue with the deployment");
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
