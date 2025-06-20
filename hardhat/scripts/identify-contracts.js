const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Identifying Contract Types...\n");

  try {
    // Read the OpenZeppelin deployments file
    const deploymentsPath = path.join(
      __dirname,
      "../.openzeppelin/sepolia.json"
    );
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

    console.log("🔧 IMPLEMENTATION CONTRACTS:");
    console.log("=".repeat(60));

    // Check each implementation
    Object.entries(deployments.impls).forEach(([hash, impl], index) => {
      console.log(`${index + 1}. Implementation Hash: ${hash}`);
      console.log(`   Address: ${impl.address}`);
      console.log(`   Transaction: ${impl.txHash}`);

      // Identify by storage layout
      if (impl.layout && impl.layout.storage) {
        const storage = impl.layout.storage;
        const hasGroupRoots = storage.some(
          (item) => item.label === "groupRoots"
        );
        const hasRelayer = storage.some((item) => item.label === "relayer");

        if (hasGroupRoots) {
          console.log("   📋 Type: MembershipManager Implementation");
        } else if (hasRelayer) {
          console.log("   📋 Type: Governor Implementation");
        } else {
          console.log("   📋 Type: Unknown");
        }
      }
      console.log("");
    });

    console.log("📦 PROXY CONTRACTS:");
    console.log("=".repeat(60));

    // Check each proxy
    for (let i = 0; i < deployments.proxies.length; i++) {
      const proxy = deployments.proxies[i];
      console.log(`${i + 1}. Proxy Address: ${proxy.address}`);
      console.log(`   Transaction: ${proxy.txHash}`);
      console.log(`   Type: ${proxy.kind.toUpperCase()}`);

      // Try to identify the contract type by calling functions
      try {
        const code = await ethers.provider.getCode(proxy.address);
        if (code === "0x") {
          console.log("   ❌ No contract deployed at this address");
          continue;
        }

        // Try MembershipManager functions
        try {
          const membershipManager = await ethers.getContractAt(
            "MembershipManager",
            proxy.address
          );
          const verifier = await membershipManager.verifier();
          console.log("   📋 Contract Type: MembershipManager Proxy");
          console.log(`   🔐 Verifier: ${verifier}`);
        } catch (error) {
          // Try Governor functions
          try {
            const governor = await ethers.getContractAt(
              "Governor",
              proxy.address
            );
            const relayer = await governor.relayer();
            console.log("   📋 Contract Type: Governor Proxy");
            console.log(`   📡 Relayer: ${relayer}`);
          } catch (error) {
            console.log("   ❓ Unknown contract type");
          }
        }
      } catch (error) {
        console.log("   ❌ Error checking contract:", error.message);
      }
      console.log("");
    }

    console.log("📝 SUMMARY:");
    console.log("=".repeat(60));
    console.log("• Use PROXY addresses in your frontend");
    console.log("• IMPLEMENTATION addresses contain the logic");
    console.log("• Both contracts are upgradeable via UUPS pattern");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error reading deployments:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
