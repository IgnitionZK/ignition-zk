const { ethers } = require("hardhat");

async function main() {

    // Change address below as needed
    const treasuryFactoryAddress = "0x993b458cC00a705ed2295edDb6f21C15Fde67A26";
    
    // Interface with the function signature
    const iface = new ethers.Interface([
        "function setTreasuryFactory(address _treasuryFactory)"
    ]);

    // Encode the function call with parameters
    const encodedData = iface.encodeFunctionData(
        "setTreasuryFactory", 
        [treasuryFactoryAddress]
    );
  
    console.log("Encoded data for setTreasuryFactory call:");
    console.log(encodedData);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});