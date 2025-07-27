import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyMembership } from "../../relayers/useRelayerVerifyMembership";
import { uuidToBytes32 } from "../../../utils/uuidToBytes32";

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
  const { generateMembershipProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  // Hook for verifying membership
  const { verifyMembership: relayerVerifyMembership } =
    useRelayerVerifyMembership();

  /**
   * Verifies membership using zero-knowledge proofs
   * @param {Array<number>} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase for proof generation
   * @param {string} groupId - Group ID for proof generation
   * @returns {Promise<{isValid: boolean, publicSignals: Array<number>}>} Object containing verification result and public signals
   * @throws {Error} If wallet is not connected or verification fails
   */
  const verifyMembership = async (commitmentArray, mnemonic, groupId) => {
    // LOG: Input to proof generation
    console.log("[FRONTEND/useVerifyMembership] Inputs:", {
      commitmentArray,
      mnemonic,
      groupId,
    });

    if (!address || !provider) {
      throw new Error("Wallet not connected");
    }

    console.log("Commitment array: ", commitmentArray);
    console.log("Mnemonic: ", mnemonic);
    console.log("GroupID: ", groupId);

    setIsVerifying(true);
    setError(null);

    try {
      // Generate the proof using the membership circuit
      const { proof, publicSignals } = await generateMembershipProofFromInput(
        commitmentArray,
        mnemonic,
        groupId
      );

      // LOG: Proof and public signals after generation
      console.log("[FRONTEND/useVerifyMembership] Proof generated:", proof);
      console.log(
        "[FRONTEND/useVerifyMembership] Public signals generated:",
        publicSignals
      );

      // Convert proof and public signals to Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

      // LOG: Solidity calldata
      console.log(
        "[FRONTEND/useVerifyMembership] Proof Solidity:",
        proofSolidity
      );
      console.log(
        "[FRONTEND/useVerifyMembership] Public Signals Solidity:",
        publicSignalsSolidity
      );

      // Convert the groupId UUID to bytes32 format
      const groupKeyBytes32 = uuidToBytes32(groupId);

      // LOG: Data sent to relayer
      console.log("[FRONTEND/useVerifyMembership] Data sent to relayer:", {
        proof: proofSolidity,
        publicSignals: publicSignalsSolidity,
        // !!!!
        groupKey: groupKeyBytes32,
      });

      // Verify the proof using the relayer
      console.log("Verifying membership with relayer...");
      console.log("Group ID: ", groupId);
      console.log("Group Key Bytes32: ", groupKeyBytes32);

      return await new Promise((resolve, reject) => {
        relayerVerifyMembership(
          {
            proof: proofSolidity,
            publicSignals: publicSignalsSolidity,
            groupKey: groupKeyBytes32, // Send as bytes32 hex string
          },
          {
            onSuccess: (data) => {
              console.log("Relayer verification successful:", data);
              resolve({ isValid: true, publicSignals });
            },
            onError: (error) => {
              console.error("Relayer verification failed:", error);
              reject(new Error("Relayer verification failed"));
            },
          }
        );
      });
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
