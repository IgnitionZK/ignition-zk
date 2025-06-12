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
  "0x8C3f64C4D2315842e40Fa281a0dF7411F1Caf13f";

export function useVerifyMembership() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  const verifyMembership = async (commitmentArray, mnemonic) => {
    if (!address || !provider) {
      throw new Error("Wallet not connected");
    }

    console.log("Commitment array: ", commitmentArray);
    console.log("Mnemonic: ", mnemonic);

    setIsVerifying(true);
    setError(null);

    try {
      // Generate the proof
      const { proof, publicSignals } = await generateProofFromInput(
        commitmentArray,
        mnemonic,
        "membership"
      );

      console.log("Proof: ", proof);
      console.log("Public Signals: ", publicSignals);

      // Convert proof and public signals to Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

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

      return isValid;
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
