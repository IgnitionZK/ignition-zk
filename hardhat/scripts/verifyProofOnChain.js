/*const { ethers } = require("hardhat");
const { ZKProofGenerator } = require("../../frontend/src/scripts/generateZKProof-browser-safe.js");
const { fs } = require("fs");
require("dotenv").config();

async function main() {

    const wasm = "../zk/circuits/membership/build/membership_circuit_js/membership_circuit.wasm";
    const zkey = "../zk/circuits/membership/build/membership_circuit_final.zkey";
    const vkey = "../zk/circuits/membership/build/membership_circuit_key.json";

    async function convertToArrayBuffer(filePath) { 
        try {
            const response = await fs.readFile(filePath);  
            return response;
            // Browser environment:
            //const response = await fetch(filePath); -- use fetch if running in a browser environment
            //if (!response.ok) {
            //    throw new Error(`Failed to fetch file: ${filePath}`);
            //}
            //return await response.arrayBuffer(); -- convert to ArrayBuffer if using fetch
        } catch (error) {
            console.error("Error converting file to ArrayBuffer:", error);
        }
    }

    // MemberShipVerifier contract address on Sepolia
    const contractAddress = process.env.MEMBERSHIP_VERIFIER;
    console.log(`Using MembershipVerifier contract at address: ${contractAddress}`);

    // Initialize the provider and signer (use provider for read-only operations)
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA_URL);
    console.log(`Using provider: ${process.env.ALCHEMY_SEPOLIA_URL}`);
    //const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Read the contract ABI from the artifact
    const contractArtifact = await artifacts.readArtifact("MembershipVerifier");
    const contractABI = contractArtifact.abi;
    console.log(`Using contract ABI: ${JSON.stringify(contractABI)}`);

    // Create a contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Group ID: 81373f0e-8e13-4b8f-80fa-4e8f94821a1e
    // Commitment values and group IDs extracted from DB: hashedLeaves.json
    // SQL query: select commitment_value, group_id from ignitionzk.merkle_tree_leaves where is_active = true order by created_at;
    const targetGroupId = "81373f0e-8e13-4b8f-80fa-4e8f94821a1e";
    
    // User1 test1@mail.com
    const mnemonic =
      "immune common syrup eight obscure include cake wagon night bid orange blind";
    
    const commitmentArray = [
      BigInt("18301975437076688951605982531442620507009188043025261735726303471281552796279"),
      BigInt("19128431862593125093240678832526009953834018963693806080768561024152237934378"),
      BigInt("10200179915901109051215990462616205975059062619217578594631574969177607770325")
    ];

    
    const circuitInput = await ZKProofGenerator.generateCircuitInput(
    mnemonic,
    commitmentArray
    );

    async function generateProof(circuitInput, circuitType = "membership") {
       
        try {
          const wasmBuffer = await convertToArrayBuffer(wasm);
          if (!wasmBuffer) {
            throw new Error(`Failed to load WASM file from ${wasm}`);
          }
    
          const zkeyBuffer = await convertToArrayBuffer(zkey);
          if (!zkeyBuffer) {
            throw new Error(`Failed to load zkey file from ${zkey}`);
          }
    
          try {
            const { proof, publicSignals } = await plonk.fullProve(
              circuitInput,
              wasmBuffer,
              zkeyBuffer
            );
            return { proof, publicSignals };
          } catch (proveError) {
            console.error("Error in plonk.fullProve:", proveError);
            throw proveError;
          }
        } catch (error) {
          console.error("Error in file loading or proof generation:", error);
          throw error;
        }
      }
    
    const { proof, publicSignals } = await generateProof(circuitInput
    , "membership");

    const isValidProof = await ZKProofGenerator.verifyProofOnChain(
    proof,
    publicSignals,
    contract
    );

    console.log(`Is the proof valid? ${isValidProof}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  */
