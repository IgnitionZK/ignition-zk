const fs = require("fs");
const path = require("path");

/**
 * Utility script to update hardcoded addresses in deployment scripts
 * Usage: node scripts/update-deployment-addresses.js
 */

// Configuration - Update these addresses after each deployment step
const DEPLOYED_ADDRESSES = {
  // Step 0 - Verifier Contracts
  MEMBERSHIP_VERIFIER: "0xf1b3963996420a1765B452AB51ad7b52e94F9C1d", // FROM STEP 0
  PROPOSAL_VERIFIER: "0x472Ad7b69eB3C6a2F885933b96D8D4Ef111bc8bd", // FROM STEP 0
  PROPOSAL_CLAIM_VERIFIER: "0x7a2ED32E1C83981F7160fFb61275a9d29b007d9e", // FROM STEP 0
  VOTE_VERIFIER: "0x1FC190Ad4A867B8d334b16838A6569a05f301dC2", // FROM STEP 0

  // Step 1 - ERC721 Implementation
  NFT_IMPLEMENTATION: "0x7C33a33561C0CFa6EECA18239A119d3FD3267B2A", // FROM STEP 1

  // Step 2 - Manager Contracts
  MEMBERSHIP_MANAGER: "0x8370E9d59a97Ad443F9a1E1e628f9932639fD3fb", // FROM STEP 2
  PROPOSAL_MANAGER: "0x3951B85B02C4E5C4A5e9144AF18d7A89c5fcaDfD", // FROM STEP 2
  VOTE_MANAGER: "0xCC6C9f964d4aFa53974C2Da490bf957d37214d85", // FROM STEP 2

  // Step 3 - Governance
  GOVERNANCE_MANAGER: "0x7ab21Db27Cb94944C5316aE93dA4AA796d673c8a", // FROM STEP 3

  // Step 5 - Treasury
  TREASURY_MANAGER: "0xEfE84aAF81B7c905B6F28a83DCB692550B9aB12F",
  BEACON_MANAGER: "0x5675F4ae97A331E71b9821969e14933409Bb4A8f",
  TREASURY_FACTORY: "0xe02165A1bc0E6cd67A828D370A40faA72490D46a",

  // Step 6 - Funding Modules
  GRANT_MODULE: "0x1944Bf71e6ff9F84FE1CBC0A182846aB6BEA3f23"
};

// Files to update with their address mappings
const FILES_TO_UPDATE = {
  "scripts/deploy-step2-managers.js": {
    NFT_IMPLEMENTATION_ADDRESS: "NFT_IMPLEMENTATION",
    MEMBERSHIP_VERIFIER_ADDRESS: "MEMBERSHIP_VERIFIER",
    PROPOSAL_VERIFIER_ADDRESS: "PROPOSAL_VERIFIER",
    PROPOSAL_CLAIM_VERIFIER_ADDRESS: "PROPOSAL_CLAIM_VERIFIER",
    VOTE_VERIFIER_ADDRESS: "VOTE_VERIFIER",
  },
  "scripts/deploy-step3-governor.js": {
    MEMBERSHIP_MANAGER_ADDRESS: "MEMBERSHIP_MANAGER",
    PROPOSAL_MANAGER_ADDRESS: "PROPOSAL_MANAGER",
    VOTE_MANAGER_ADDRESS: "VOTE_MANAGER",
  },
  "scripts/deploy-step4-transferOwnership.js": {
    MEMBERSHIP_MANAGER_ADDRESS: "MEMBERSHIP_MANAGER",
    PROPOSAL_MANAGER_ADDRESS: "PROPOSAL_MANAGER",
    VOTE_MANAGER_ADDRESS: "VOTE_MANAGER",
    GOVERNOR_ADDRESS: "GOVERNANCE_MANAGER",
    NFT_IMPLEMENTATION: "NFT_IMPLEMENTATION",
  },
  "scripts/deploy-step5-treasury.js": {
    GOVERNOR_ADDRESS: "GOVERNANCE_MANAGER"
  },
  "scripts/deploy-step6-fundingModules.js": {
    GOVERNOR_ADDRESS: "GOVERNANCE_MANAGER"
  },
};

function updateAddresses() {
  console.log("🔄 Updating deployment script addresses...\n");

  let totalUpdates = 0;

  for (const [filePath, addressMappings] of Object.entries(FILES_TO_UPDATE)) {
    const fullPath = path.join(__dirname, "..", filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    let content = fs.readFileSync(fullPath, "utf8");
    let fileUpdates = 0;

    for (const [scriptVariable, deployedAddressKey] of Object.entries(
      addressMappings
    )) {
      const newAddress = DEPLOYED_ADDRESSES[deployedAddressKey];

      if (newAddress === "0x0000000000000000000000000000000000000000") {
        console.log(`⚠️  Skipping ${scriptVariable} - address not set`);
        continue;
      }

      // Create regex pattern to match the address assignment
      const pattern = new RegExp(`(${scriptVariable}\\s*=\\s*)"[^"]*"`, "g");
      const replacement = `$1"${newAddress}"`;

      if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        fileUpdates++;
        console.log(`✅ Updated ${scriptVariable} in ${filePath}`);
      } else {
        console.log(`⚠️  Could not find ${scriptVariable} in ${filePath}`);
      }
    }

    if (fileUpdates > 0) {
      fs.writeFileSync(fullPath, content);
      totalUpdates += fileUpdates;
      console.log(`📝 Wrote ${fileUpdates} updates to ${filePath}\n`);
    }
  }

  console.log(`🎉 Total updates: ${totalUpdates}`);

  if (totalUpdates === 0) {
    console.log("\n💡 To use this script:");
    console.log(
      "1. Update the DEPLOYED_ADDRESSES object with your deployed contract addresses"
    );
    console.log("2. Run this script again");
    console.log(
      "3. The script will automatically update all deployment scripts"
    );
  }
}

// Check if any addresses are set
const hasAddresses = Object.values(DEPLOYED_ADDRESSES).some(
  (addr) => addr !== "0x0000000000000000000000000000000000000000"
);

if (!hasAddresses) {
  console.log("📋 Current Deployment Addresses:");
  console.log(
    "(All addresses are set to zero - update DEPLOYED_ADDRESSES object first)\n"
  );

  for (const [key, value] of Object.entries(DEPLOYED_ADDRESSES)) {
    console.log(`${key}: ${value}`);
  }

  console.log("\n💡 Instructions:");
  console.log("1. Run your deployment steps (0-4)");
  console.log(
    "2. Copy the deployed addresses into the DEPLOYED_ADDRESSES object above"
  );
  console.log("3. Run this script again to update all deployment files");
} else {
  updateAddresses();
}
