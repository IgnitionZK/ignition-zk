require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  console.log("🔍 Calling delegateGetFundingRequest from GovernanceManager...");

  // Contract addresses
  const GOVERNANCE_MANAGER_ADDRESS =
    "0x364773751c69f6ED23f9C65Eec28Aa4444fc76fB";

  // Parameters
  const groupKey =
    "0x183d36a5e60881d841a1fac7dd3a26f6edc628a07391e4ce6e3564862d438bcd";
  const contextKey =
    "0x29ce33768b944c92ef10794f718ff07fda861a1e0aafe825a77f16d4c455adca";

  // Minimal ABI for the function we need
  const abi = [
    "function delegateGetFundingRequest(bytes32 groupKey, bytes32 contextKey) external view returns (tuple(bytes32 fundingType, address from, address to, uint256 amount, uint256 requestedAt, uint256 releaseTime, bool approved, bool executed, bool cancelled))",
    "function delegateGetTreasuryAddress(bytes32 groupKey) external view returns (address)",
  ];

  try {
    // Connect to Sepolia network
    const provider = new ethers.JsonRpcProvider(
      process.env.ALCHEMY_SEPOLIA_URL
    );

    // Create wallet instance
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log("👤 Using signer:", wallet.address);

    // Create contract instance
    const governanceManager = new ethers.Contract(
      GOVERNANCE_MANAGER_ADDRESS,
      abi,
      wallet
    );

    console.log("📋 Contract address:", GOVERNANCE_MANAGER_ADDRESS);
    console.log("🔑 Group key:", groupKey);
    console.log("🔑 Context key:", contextKey);
    console.log("\n⏳ Calling delegateGetFundingRequest...");

    // Call the function
    const fundingRequest = await governanceManager.delegateGetFundingRequest(
      groupKey,
      contextKey
    );

    const treasuryAddress = await governanceManager.delegateGetTreasuryAddress(groupKey);
    console.log("Treasury address:", treasuryAddress);

    console.log("\n✅ Funding Request retrieved successfully!");
    console.log("📊 Funding Request Details:");
    console.log("  Funding Type:", fundingRequest[0]);
    console.log("  From Address:", fundingRequest[1]);
    console.log("  To Address:", fundingRequest[2]);
    console.log("  Amount:", ethers.formatEther(fundingRequest[3]), "ETH");
    console.log(
      "  Requested At:",
      new Date(Number(fundingRequest[4]) * 1000).toISOString()
    );
    console.log(
      "  Release Time:",
      new Date(Number(fundingRequest[5]) * 1000).toISOString()
    );
    console.log("  Approved:", fundingRequest[6]);
    console.log("  Executed:", fundingRequest[7]);
    console.log("  Cancelled:", fundingRequest[8]);
  } catch (error) {
    console.error("❌ Error calling delegateGetFundingRequest:");
    console.error(error.message);

    // If it's a contract error, try to decode it
    if (error.data) {
      console.error("🔍 Raw error data:", error.data);
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
