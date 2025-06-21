require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-ignition"); 
require("hardhat-contract-sizer");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 100_000 }, // use a very high runs value
      //viaIR: true,                                   // ▶ 5‑10 % size drop
      // metadata: { bytecodeHash: "none" }             // saves ±120 bytes
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true, // Will run automatically on compilation
    strict: true,
    only: [
      "MembershipManager",
      "ERC721IgnitionZK",
      "MembershipVerifier",
      "Governor",
    ],
  },
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 20000000000, // 20 gwei
      gas: 8000000, // 8M gas limit
      timeout: 300000, // 5 minutes
    },
    localhost: {
      url: "http://127.0.0.1:8545", // Local Hardhat node URL
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
    },
  },
};
