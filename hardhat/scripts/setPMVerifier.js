const { ethers } = require("hardhat");

async function updateVerifier() {

    const PROPOSAL_VERIFIER_ADDRESS =
    "0x472Ad7b69eB3C6a2F885933b96D8D4Ef111bc8bd"; 
    const GOVERNANCE_MANAGER_ADDRESS = "0xfa2DA157db72EB1666a03019C1286eDFAF6cEa5c";

    const governor = await ethers.getContractAt(
      "GovernanceManager",
      GOVERNANCE_MANAGER_ADDRESS
    );

    console.log("Updating Proposal Submission Verifier...");
    const currAddress = await governor.delegateGetProposalSubmissionVerifier();
    console.log("Proposal Submission Verifier current address:", currAddress);

    const tx = await governor.delegateSetProposalSubmissionVerifier(
      PROPOSAL_VERIFIER_ADDRESS
    );
    await tx.wait();

    const newAddr = await governor.delegateGetProposalSubmissionVerifier();
    console.log("Proposal Submission Verifier updated to:", newAddr);
}

updateVerifier()
  .then(() => console.log("Verifier updated successfully"));