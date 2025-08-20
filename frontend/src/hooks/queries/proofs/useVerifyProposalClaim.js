import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyProposalClaim } from "../../relayers/useRelayerVerifyProposalClaim";

/**
 * Custom hook for verifying proposal claim using zero-knowledge proofs.
 * This hook handles the complete workflow of generating ZK proofs for proposal claims,
 * verifying them off-chain, and submitting them to the blockchain via a relayer.
 * It manages the verification state, error handling, and integrates with the wallet
 * and proof generation systems.
 */
export function useVerifyProposalClaim() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  const { verifyProposalClaim: relayerVerifyProposalClaim } =
    useRelayerVerifyProposalClaim();

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

      const { proof, publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        "proposal-claim"
      );

      console.log("Generated Proof:", proof);
      console.log("Generated Public Signals:", publicSignals);

      const isValidOffChain = await ZKProofGenerator.verifyProofOffChain(
        proof,
        publicSignals,
        "proposal-claim"
      );

      if (!isValidOffChain) {
        throw new Error("Off-chain proof verification failed");
      }

      console.log("Off-chain proof verification successful");

      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

      console.log("Solidity Proof:", proofSolidity);
      console.log("Solidity Public Signals:", publicSignalsSolidity);

      const contextKey = await ZKProofGenerator.computeContextKey(
        groupId.toString(),
        epochId.toString()
      );

      console.log("Context Key:", contextKey);

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
