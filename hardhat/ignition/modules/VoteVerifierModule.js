const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("VoteVerifierModule", (m) => {
  const voteVerifier = m.contract("VoteVerifier");
  return { voteVerifier };
});
