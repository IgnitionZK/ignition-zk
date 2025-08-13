import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyProposalClaim } from "../../relayers/useRelayerVerifyProposalClaim";

/**
 * Custom hook for verifying proposal claim using zero-knowledge proofs
 * @returns {Object} An object containing the verification function and state
 * @property {Function} verifyProposalClaim - Function to verify proposal claim
 * @property {boolean} isVerifying - Loading state for verification process
 * @property {string|null} error - Error message if verification fails
 */
export function useVerifyProposalClaim() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  // Hook for verifying proposal claim
  const { verifyProposalClaim: relayerVerifyProposalClaim } =
    useRelayerVerifyProposalClaim();

  /**
   * Verifies proposal claim using zero-knowledge proofs
   * @param {Array<number>} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase for proof generation
   * @param {string} groupId - Group ID for proof generation
   * @param {string} epochId - Epoch ID for proof generation
   * @param {string} proposalClaimHash - The proposal claim nullifier hash
   * @param {string} proposalSubmissionHash - The proposal submission nullifier hash
   * @returns {Promise<{isValid: boolean, publicSignals: Array<number>}>} Object containing verification result and public signals
   * @throws {Error} If wallet is not connected or verification fails
   */
  const verifyProposalClaim = async (
    commitmentArray,
    mnemonic,
    groupId,
    epochId,
    proposalClaimHash,
    proposalSubmissionHash
  ) => {
    if (!address || !provider) {
      throw new Error("Wallet not connected");
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log("Generating proposal claim proof...");
      console.log("Commitment Array:", commitmentArray);
      console.log("Group ID:", groupId);
      console.log("Epoch ID:", epochId);
      console.log("Proposal Claim Hash:", proposalClaimHash);
      console.log("Proposal Submission Hash:", proposalSubmissionHash);

      // Generate the circuit input for proposal claim
      const circuitInput =
        await ZKProofGenerator.generateProposalClaimCircuitInput(
          mnemonic,
          commitmentArray,
          groupId,
          epochId,
          proposalClaimHash,
          proposalSubmissionHash
        );

      console.log("Circuit Input:", circuitInput);

      // Generate the ZK proof
      const { proof, publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        "proposal-claim"
      );

      console.log("Generated Proof:", proof);
      console.log("Generated Public Signals:", publicSignals);

      // Verify the proof off-chain first
      const isValidOffChain = await ZKProofGenerator.verifyProofOffChain(
        proof,
        publicSignals,
        "proposal-claim"
      );

      if (!isValidOffChain) {
        throw new Error("Off-chain proof verification failed");
      }

      console.log("Off-chain proof verification successful");

      // Generate Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

      console.log("Solidity Proof:", proofSolidity);
      console.log("Solidity Public Signals:", publicSignalsSolidity);

      // Compute the context key using Poseidon hash (groupId, epochId)
      const contextKey = await ZKProofGenerator.computeContextKey(
        groupId.toString(),
        epochId.toString()
      );

      console.log("Context Key:", contextKey);

      // Verify the proof using the relayer
      console.log("Verifying proposal claim with relayer...");
      console.log("Group ID:", groupId);
      console.log("Epoch ID:", epochId);

      return await new Promise((resolve, reject) => {
        relayerVerifyProposalClaim(
          {
            proof: proofSolidity,
            publicSignals: publicSignalsSolidity,
            contextKey: contextKey,
          },
          {
            onSuccess: (data) => {
              console.log("Relayer verification successful:", data);
              resolve({
                isValid: true,
                publicSignals: publicSignalsSolidity,
                proof: proofSolidity,
                contextKey: contextKey,
              });
            },
            onError: (error) => {
              console.error("Relayer verification failed:", error);
              reject(new Error("Relayer verification failed"));
            },
          }
        );
      });
    } catch (err) {
      setError(err.message || "Failed to verify proposal claim");
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyProposalClaim,
    isVerifying: isVerifying || isGeneratingProof,
    error,
  };
}
