//import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MembershipVerifierModule",
  (m) => {
    const membershipVerifier = m.contract("MembershipVerifier");
    return { membershipVerifier }
});
