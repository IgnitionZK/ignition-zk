const { ethers } = require("hardhat");

async function main() {
  const functionSelector = "0x220f5595";

  const ContractFactory = await ethers.getContractFactory("GovernanceManager");
  const contractInterface = ContractFactory.interface;

  console.log(`Looking for function with selector: ${functionSelector}`);

  let found = false;

  // Loop through function fragments only
  for (const fragment of contractInterface.fragments) {
    if (fragment.type !== "function") continue; // Skip non-function entries

    // Ethers v6 way to get selector:
    const signature = fragment.format("full");
    const sighash = ethers.id(fragment.format("sighash")).slice(0, 10); 
    //console.log(`Checking function: ${fragment.name} => ${sighash}`);

    if (sighash.toLowerCase() === functionSelector.toLowerCase()) {
      console.log("✅ Match found:");
      console.log("  Name:", fragment.name);
      console.log("  Signature:", signature);
      console.log("  Selector:", sighash);
      found = true;
      break;
    }
  }

  if (!found) {
    console.log("❌ No matching function found.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});