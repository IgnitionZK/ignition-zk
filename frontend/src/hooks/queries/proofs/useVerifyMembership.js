import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { ethers } from "ethers";

// ABI for the MembershipVerifier contract
const MEMBERSHIP_VERIFIER_ABI = [
  "function verifyProof(uint256[24] calldata _proof, uint256[2] calldata _pubSignals) public view returns (bool)",
];

const MEMBERSHIP_VERIFIER_ADDRESS =
  "0x03032Eb295D287cE69d0c9be0F75F35d916564A6";

/**
 * Custom hook for verifying membership using zero-knowledge proofs
 * @returns {Object} An object containing the verification function and state
 * @property {Function} verifyMembership - Function to verify membership
 * @property {boolean} isVerifying - Loading state for verification process
 * @property {string|null} error - Error message if verification fails
 */
export function useVerifyMembership() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  /**
   * Verifies membership using zero-knowledge proofs
   * @param {Array<number>} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase for proof generation
   * @param {string} externalNullifier - External nullifier for proof generation
   * @returns {Promise<{isValid: boolean, publicSignals: Array<number>}>} Object containing verification result and public signals
   * @throws {Error} If wallet is not connected or verification fails
   */
  const verifyMembership = async (
    commitmentArray,
    mnemonic,
    externalNullifier
  ) => {
    if (!address || !provider) {
      throw new Error("Wallet not connected");
    }

    console.log("Commitment array: ", commitmentArray);
    console.log("Mnemonic: ", mnemonic);
    console.log("External Nullifier: ", externalNullifier);

    setIsVerifying(true);
    setError(null);

    try {
      // Generate the proof
      const { proof, publicSignals } = await generateProofFromInput(
        commitmentArray,
        mnemonic,
        externalNullifier,
        "membership"
      );

      console.log("Proof: ", proof);
      console.log("Public Signals: ", publicSignals);

      // Convert proof and public signals to Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);
      console.log("Proof Solidity: ", proofSolidity);
      console.log("Public Signals Solidity: ", publicSignalsSolidity);

      // Create contract instance
      const contract = new ethers.Contract(
        MEMBERSHIP_VERIFIER_ADDRESS,
        MEMBERSHIP_VERIFIER_ABI,
        provider
      );

      // Use ZKProofGenerator's verifyProofOnChain method
      const isValid = await ZKProofGenerator.verifyProofOnChain(
        proofSolidity,
        publicSignalsSolidity,
        contract
      );

      return { isValid, publicSignals };
    } catch (err) {
      setError(err.message || "Failed to verify membership");
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyMembership,
    isVerifying: isVerifying || isGeneratingProof,
    error,
  };
}
