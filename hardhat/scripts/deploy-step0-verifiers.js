const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Step 0: Deploying All Verifier Contracts...\n");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log(
    "💰 Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );
  console.log("");

  try {
    // Deploy MembershipVerifier
    console.log("📦 Deploying MembershipVerifier...");
    const MembershipVerifier = await ethers.getContractFactory(
      "MembershipVerifier"
    );
    const membershipVerifier = await MembershipVerifier.deploy();
    await membershipVerifier.waitForDeployment();
    const membershipVerifierAddress = await membershipVerifier.getAddress();
    console.log(
      "✅ MembershipVerifier deployed at:",
      membershipVerifierAddress
    );

    // Deploy ProposalVerifier
    console.log("📦 Deploying ProposalVerifier...");
    const ProposalVerifier = await ethers.getContractFactory(
      "ProposalVerifier"
    );
    const proposalVerifier = await ProposalVerifier.deploy();
    await proposalVerifier.waitForDeployment();
    const proposalVerifierAddress = await proposalVerifier.getAddress();
    console.log("✅ ProposalVerifier deployed at:", proposalVerifierAddress);

    // Deploy ProposalClaimVerifier
    console.log("📦 Deploying ProposalClaimVerifier...");
    const ProposalClaimVerifier = await ethers.getContractFactory(
      "ProposalClaimVerifier"
    );
    const proposalClaimVerifier = await ProposalClaimVerifier.deploy();
    await proposalClaimVerifier.waitForDeployment();
    const proposalClaimVerifierAddress =
      await proposalClaimVerifier.getAddress();
    console.log(
      "✅ ProposalClaimVerifier deployed at:",
      proposalClaimVerifierAddress
    );

    // Deploy VoteVerifier
    console.log("📦 Deploying VoteVerifier...");
    const VoteVerifier = await ethers.getContractFactory("VoteVerifier");
    const voteVerifier = await VoteVerifier.deploy();
    await voteVerifier.waitForDeployment();
    const voteVerifierAddress = await voteVerifier.getAddress();
    console.log("✅ VoteVerifier deployed at:", voteVerifierAddress);

    console.log("\n" + "=".repeat(60));
    console.log("✅ STEP 0 COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("📋 Verifier Contract Addresses:");
    console.log(`🔐 MembershipVerifier: ${membershipVerifierAddress}`);
    console.log(`📄 ProposalVerifier: ${proposalVerifierAddress}`);
    console.log(`👤 ProposalClaimVerifier: ${proposalClaimVerifierAddress}`);
    console.log(`🗳️  VoteVerifier: ${voteVerifierAddress}`);
    console.log("\n📋 Update these addresses in your deployment scripts!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Step 0 failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
