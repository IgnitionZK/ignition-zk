const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MembershipVerifierModule", (m) => {
  const membershipVerifier = m.contract("MembershipVerifier");
  return { membershipVerifier };
});
