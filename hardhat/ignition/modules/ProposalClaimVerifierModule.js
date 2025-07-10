const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ProposalClaimVerifierModule",
  (m) => {
    const proposalClaimVerifier = m.contract("ProposalClaimVerifier");
    return { proposalClaimVerifier }
});
