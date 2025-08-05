const { ethers } = require("hardhat");

async function main(contractName, fullInputData) {
  const factory = await ethers.getContractFactory(contractName);
  const iface = factory.interface;

  const initSelector = iface.getFunction("initialize").selector;
  const idx = fullInputData.indexOf(initSelector);

  if (idx === -1) {
    console.log(`❌ No initialize() selector found in input for ${contractName}`);
    return;
  }

  const initData = "0x" + fullInputData.slice(idx);

  try {
    const parsed = iface.parseTransaction({ data: initData });
    console.log(`✅ Decoded initializer for ${contractName}:`);
    console.log(`  Function: ${parsed.name}`);
    console.log(`  Args: ${parsed.args.map((a, i) => `arg${i}: ${a}`).join(", ")}`);
  } catch (err) {
    console.log(`❌ Could not decode initialize() for ${contractName}: ${err.message}`);
  }
}

main(
  "GovernanceManager",
  "0x220f559500");
