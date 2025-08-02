import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyVote } from "../../relayers/useRelayerVerifyVote";

/**
 * Custom hook for verifying vote submission using zero-knowledge proofs
 * @returns {Object} An object containing the verification function and state
 * @property {Function} verifyVote - Function to verify vote submission
 * @property {boolean} isVerifying - Loading state for verification process
 * @property {string|null} error - Error message if verification fails
 */
export function useVerifyVote() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  // Hook for verifying vote
  const { verifyVote: relayerVerifyVote } = useRelayerVerifyVote();

  /**
   * Verifies vote submission using zero-knowledge proofs
   * @param {Array<number>} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase for proof generation
   * @param {string} groupId - Group ID for proof generation
   * @param {string} epochId - Epoch ID for proof generation
   * @param {string} proposalId - Proposal ID for proof generation
   * @param {number} voteChoice - Vote choice (0 for No, 1 for Yes)
   * @returns {Promise<{isValid: boolean, publicSignals: Array<number>}>} Object containing verification result and public signals
   * @throws {Error} If wallet is not connected or verification fails
   */
  const verifyVote = async (
    commitmentArray,
    mnemonic,
    groupId,
    epochId,
    proposalId,
    voteChoice
  ) => {
    // LOG: Input to proof generation
    console.log("[FRONTEND/useVerifyVote] Inputs:", {
      commitmentArray,
      mnemonic,
      groupId,
      epochId,
      proposalId,
      voteChoice,
    });

    if (!address || !provider) {
      throw new Error("Wallet not connected");
    }

    console.log("Commitment array: ", commitmentArray);
    console.log("Mnemonic: ", mnemonic);
    console.log("GroupID: ", groupId);
    console.log("EpochID: ", epochId);
    console.log("ProposalID: ", proposalId);
    console.log("Vote Choice: ", voteChoice);

    setIsVerifying(true);
    setError(null);

    try {
      // Generate the vote circuit input
      const circuitInput = await ZKProofGenerator.generateVoteCircuitInput(
        mnemonic,
        commitmentArray,
        groupId,
        epochId,
        proposalId,
        voteChoice
      );

      // Generate the proof
      const { proof, publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        "vote"
      );

      // LOG: Proof and public signals after generation
      console.log("[FRONTEND/useVerifyVote] Proof generated:", proof);
      console.log(
        "[FRONTEND/useVerifyVote] Public signals generated:",
        publicSignals
      );

      // VoteManager expects: [voteContextHash, voteNullifier, voteChoiceHash, root]
      const reorderedPublicSignals = [
        publicSignals[0], // voteContextHash
        publicSignals[1], // voteNullifier
        publicSignals[2], // onChainVerifiableVoteChoiceHash
        publicSignals[3], // root
      ];

      // Convert proof and public signals to Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(
          proof,
          reorderedPublicSignals
        );

      // LOG: Solidity calldata
      console.log("[FRONTEND/useVerifyVote] Proof Solidity:", proofSolidity);
      console.log(
        "[FRONTEND/useVerifyVote] Public Signals Solidity:",
        publicSignalsSolidity
      );

      // LOG: Data sent to relayer
      console.log("[FRONTEND/useVerifyVote] Data sent to relayer:", {
        proof: proofSolidity,
        publicSignals: publicSignalsSolidity,
        groupKey: groupId.toString(),
        epochKey: epochId.toString(),
        proposalKey: proposalId.toString(),
      });

      // Verify the proof using the relayer
      console.log("Verifying vote with relayer...");
      console.log("Group ID: ", groupId);
      console.log("Epoch ID: ", epochId);
      console.log("Proposal ID: ", proposalId);

      return await new Promise((resolve, reject) => {
        relayerVerifyVote(
          {
            proof: proofSolidity,
            publicSignals: publicSignalsSolidity,
            groupKey: groupId.toString(), // Convert to string as expected by edge function
            epochKey: epochId.toString(), // Convert to string as expected by edge function
            proposalKey: proposalId.toString(), // Convert to string as expected by edge function
          },
          {
            onSuccess: (data) => {
              console.log("Relayer verification successful:", data);
              resolve({
                isValid: true,
                publicSignals: publicSignalsSolidity,
                proof: proofSolidity,
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
      setError(err.message || "Failed to verify vote");
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyVote,
    isVerifying: isVerifying || isGeneratingProof,
    error,
  };
}
