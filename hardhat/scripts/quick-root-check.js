const { ethers } = require("hardhat");

/**
 * Quick script to check the current Merkle tree root for a group
 *
 * Usage: npx hardhat run scripts/quick-root-check.js --network sepolia
 *
 * This is a simplified version for quick verification
 */

async function main() {
  console.log("🔍 Quick Merkle Root Check\n");

  // Configuration
  const GOVERNANCE_MANAGER_ADDRESS =
    "0x809B3aF634aC3F45bfDFc09Fd7887F980831DC13";
  const GROUP_KEY = "706e755f-8c6e-4ce3-b580-9ba9dace2e9b"; // Update this with your group key

  try {
    // Get contract instance
    const governanceManager = await ethers.getContractAt(
      "GovernanceManager",
      GOVERNANCE_MANAGER_ADDRESS
    );

    // Get membership manager address
    const membershipManagerAddress =
      await governanceManager.getMembershipManager();
    const membershipManager = await ethers.getContractAt(
      "MembershipManager",
      membershipManagerAddress
    );

    // Convert group key to bytes32
    const bytes32GroupKey = ethers.keccak256(ethers.toUtf8Bytes(GROUP_KEY));

    // Try to get current root using delegateGetRoot (relayer permission)
    let currentRoot;
    try {
      currentRoot = await governanceManager.delegateGetRoot(bytes32GroupKey);
      console.log("✅ Successfully read root using delegateGetRoot");
    } catch (error) {
      console.log(
        "❌ Failed to read root using delegateGetRoot:",
        error.message
      );

      // Fallback: try direct getRoot (requires owner permission)
      try {
        currentRoot = await membershipManager.getRoot(bytes32GroupKey);
        console.log("✅ Successfully read root using direct getRoot");
      } catch (directError) {
        console.log(
          "❌ Failed to read root (permission issue):",
          directError.message
        );
        console.log(
          "   This is expected if the current signer is not the owner/governor"
        );
        return;
      }
    }

    console.log("📋 Results:");
    console.log(`🔑 Group Key: ${GROUP_KEY}`);
    console.log(`🔑 Bytes32 Key: ${bytes32GroupKey}`);
    console.log(`🌳 Current Root: ${currentRoot}`);

    if (currentRoot === ethers.ZeroHash) {
      console.log("⚠️  Root is zero - not initialized yet");
    } else {
      console.log("✅ Root is set");
    }

    // Check recent events
    const currentBlock = await ethers.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100); // Last 100 blocks

    try {
      const allRootEvents = await membershipManager.queryFilter(
        membershipManager.filters.RootSet(),
        fromBlock,
        currentBlock
      );

      const allInitEvents = await membershipManager.queryFilter(
        membershipManager.filters.RootInitialized(),
        fromBlock,
        currentBlock
      );

      // Filter for our group
      const groupRootEvents = allRootEvents.filter(
        (event) => event.args.groupKey === bytes32GroupKey
      );

      const groupInitEvents = allInitEvents.filter(
        (event) => event.args.groupKey === bytes32GroupKey
      );

      console.log(`\n📅 Recent Events (last 100 blocks):`);
      console.log(`   RootSet for this group: ${groupRootEvents.length}`);
      console.log(
        `   RootInitialized for this group: ${groupInitEvents.length}`
      );
      console.log(`   Total RootSet events: ${allRootEvents.length}`);
      console.log(`   Total RootInitialized events: ${allInitEvents.length}`);

      if (groupRootEvents.length > 0) {
        const latestEvent = groupRootEvents[groupRootEvents.length - 1];
        console.log(`   Latest RootSet: Block ${latestEvent.blockNumber}`);
        console.log(
          `   Old → New: ${latestEvent.args.oldRoot} → ${latestEvent.args.newRoot}`
        );
      }

      if (groupInitEvents.length > 0) {
        const latestInitEvent = groupInitEvents[groupInitEvents.length - 1];
        console.log(
          `   Latest RootInitialized: Block ${latestInitEvent.blockNumber}`
        );
        console.log(`   Root: ${latestInitEvent.args.root}`);
      }
    } catch (error) {
      console.log("❌ Failed to check events:", error.message);
    }
  } catch (error) {
    console.error("❌ Check failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
