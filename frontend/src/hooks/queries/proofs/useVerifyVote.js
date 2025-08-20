import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyVote } from "../../relayers/useRelayerVerifyVote";

/**
 * Custom hook for verifying vote submission using zero-knowledge proofs
 */
export function useVerifyVote() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  const { verifyVote: relayerVerifyVote } = useRelayerVerifyVote();

  const verifyVote = async (
    commitmentArray,
    mnemonic,
    groupId,
    epochId,
    proposalId,
    voteChoice,
    proposalTitle,
    proposalDescription,
    proposalPayload,
    proposalFunding,
    proposalMetadata,
    proposalSubmissionNullifier
  ) => {
    console.log("[FRONTEND/useVerifyVote] Inputs:", {
      commitmentArray,
      mnemonic,
      groupId,
      epochId,
      proposalId,
      voteChoice,
      proposalTitle,
      proposalDescription,
      proposalPayload,
      proposalFunding,
      proposalMetadata,
      proposalSubmissionNullifier,
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
    console.log("Proposal Title: ", proposalTitle);
    console.log("Proposal Description: ", proposalDescription);
    console.log("Proposal Payload: ", proposalPayload);
    console.log("Proposal Funding: ", proposalFunding);
    console.log("Proposal Metadata: ", proposalMetadata);
    console.log("Proposal Submission Nullifier: ", proposalSubmissionNullifier);

    setIsVerifying(true);
    setError(null);

    try {
      const circuitInput = await ZKProofGenerator.generateVoteCircuitInput(
        mnemonic,
        commitmentArray,
        groupId,
        epochId,
        proposalId,
        voteChoice,
        proposalTitle,
        proposalDescription,
        proposalPayload,
        proposalFunding,
        proposalMetadata,
        proposalSubmissionNullifier
      );

      const { proof, publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        "vote"
      );

      console.log("[FRONTEND/useVerifyVote] Proof generated:", proof);
      console.log(
        "[FRONTEND/useVerifyVote] Public signals generated:",
        publicSignals
      );

      // VoteManager expects: [voteContextHash, voteNullifier, voteChoiceHash, root, proposalSubmissionNullifier]
      const reorderedPublicSignals = [
        publicSignals[0], // voteContextHash
        publicSignals[1], // voteNullifier
        publicSignals[2], // onChainVerifiableVoteChoiceHash
        publicSignals[3], // root
        publicSignals[4], // proposalSubmissionNullifier
      ];

      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(
          proof,
          reorderedPublicSignals
        );

      console.log("[FRONTEND/useVerifyVote] Proof Solidity:", proofSolidity);
      console.log(
        "[FRONTEND/useVerifyVote] Public Signals Solidity:",
        publicSignalsSolidity
      );

      console.log("[FRONTEND/useVerifyVote] Data sent to relayer:", {
        proof: proofSolidity,
        publicSignals: publicSignalsSolidity,
        groupKey: groupId.toString(),
        epochKey: epochId.toString(),
        proposalKey: proposalId.toString(),
      });

      console.log("Verifying vote with relayer...");
      console.log("Group ID: ", groupId);
      console.log("Epoch ID: ", epochId);
      console.log("Proposal ID: ", proposalId);

      return await new Promise((resolve, reject) => {
        relayerVerifyVote(
          {
            proof: proofSolidity,
            publicSignals: publicSignalsSolidity,
            groupKey: groupId.toString(),
            epochKey: epochId.toString(),
            proposalKey: proposalId.toString(),
          },
          {
            onSuccess: (data) => {
              console.log("Relayer verification successful:", data);
              resolve({
                isValid: true,
                publicSignals: publicSignalsSolidity,
                proof: proofSolidity,
                contextKey: data.contextKey || null,
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
