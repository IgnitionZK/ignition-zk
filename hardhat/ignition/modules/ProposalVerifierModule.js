//import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ProposalVerifierModule",
  (m) => {
    const proposalVerifier = m.contract("ProposalVerifier");
    return { proposalVerifier }
});
