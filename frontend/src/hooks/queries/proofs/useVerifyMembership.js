import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyMembership } from "../../relayers/useRelayerVerifyMembership";
import { uuidToBytes32 } from "../../../scripts/utils/uuidToBytes32";

/**
 * Custom hook for verifying membership using zero-knowledge proofs.
 *
 * This hook handles the complete membership verification workflow:
 * 1. Generates a zero-knowledge proof from user inputs (commitment array, mnemonic, group ID)
 * 2. Converts the proof and public signals to Solidity-compatible format
 * 3. Sends the verification request to a relayer for on-chain verification
 * 4. Returns the verification result and public signals
 *
 * The hook manages loading states, error handling, and wallet connection validation.
 */
export function useVerifyMembership() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateMembershipProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  const { verifyMembership: relayerVerifyMembership } =
    useRelayerVerifyMembership();

  const verifyMembership = async (commitmentArray, mnemonic, groupId) => {
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
      const { proof, publicSignals } = await generateMembershipProofFromInput(
        commitmentArray,
        mnemonic,
        groupId
      );

      console.log("[FRONTEND/useVerifyMembership] Proof generated:", proof);
      console.log(
        "[FRONTEND/useVerifyMembership] Public signals generated:",
        publicSignals
      );

      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

      console.log(
        "[FRONTEND/useVerifyMembership] Proof Solidity:",
        proofSolidity
      );
      console.log(
        "[FRONTEND/useVerifyMembership] Public Signals Solidity:",
        publicSignalsSolidity
      );

      const groupKeyBytes32 = uuidToBytes32(groupId);

      console.log("[FRONTEND/useVerifyMembership] Data sent to relayer:", {
        proof: proofSolidity,
        publicSignals: publicSignalsSolidity,
        groupKey: groupKeyBytes32,
      });

      console.log("Verifying membership with relayer...");
      console.log("Group ID: ", groupId);
      console.log("Group Key Bytes32: ", groupKeyBytes32);

      return await new Promise((resolve, reject) => {
        relayerVerifyMembership(
          {
            proof: proofSolidity,
            publicSignals: publicSignalsSolidity,
            groupKey: groupKeyBytes32,
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
