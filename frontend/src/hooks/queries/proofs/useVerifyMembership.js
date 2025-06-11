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
  "0xaeDE5a1376B914F3F6c2B1999d7A322627088496";

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

    setIsVerifying(true);
    setError(null);

    try {
      // Generate the proof
      const { proof, publicSignals } = await generateProofFromInput(
        commitmentArray,
        mnemonic,
        "membership"
      );

      // Convert proof and public signals to Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

      // Create contract instance
      const contract = new ethers.Contract(
        MEMBERSHIP_VERIFIER_ADDRESS,
        MEMBERSHIP_VERIFIER_ABI,
        provider
      );

      // Verify the proof on-chain
      const isValid = await contract.verifyProof(
        proofSolidity,
        publicSignalsSolidity
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
