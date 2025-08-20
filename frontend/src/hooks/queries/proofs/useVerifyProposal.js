import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { useRelayerVerifyProposal } from "../../relayers/useRelayerVerifyProposal";

/**
 * Custom hook for verifying proposal submissions using zero-knowledge proofs.
 *
 * This hook handles the complete proposal verification workflow:
 * 1. Generates a ZK proof from user inputs (commitment array, mnemonic, proposal details)
 * 2. Converts the proof to Solidity-compatible format
 * 3. Submits the proof to a relayer for on-chain verification
 * 4. Returns verification status and associated data
 *
 * The hook manages loading states, error handling, and coordinates between
 * proof generation, wallet connection, and relayer communication.
 */
export function useVerifyProposal() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();

  const { verifyProposal: relayerVerifyProposal } = useRelayerVerifyProposal();

  const verifyProposal = async (
    commitmentArray,
    mnemonic,
    groupId,
    epochId,
    proposalTitle,
    proposalDescription,
    proposalPayload,
    proposalFunding = {},
    proposalMetadata = {}
  ) => {
    console.log("[FRONTEND/useVerifyProposal] Inputs:", {
      commitmentArray,
      mnemonic,
      groupId,
      epochId,
      proposalTitle,
      proposalDescription,
      proposalPayload,
      proposalFunding,
      proposalMetadata,
    });

    if (!address || !provider) {
      throw new Error("Wallet not connected");
    }

    console.log("Commitment array: ", commitmentArray);
    console.log("Mnemonic: ", mnemonic);
    console.log("GroupID: ", groupId);
    console.log("EpochID: ", epochId);
    console.log("Proposal Title: ", proposalTitle);
    console.log("Proposal Description: ", proposalDescription);
    console.log("Proposal Payload: ", proposalPayload);
    console.log("Proposal Funding: ", proposalFunding);
    console.log("Proposal Metadata: ", proposalMetadata);

    setIsVerifying(true);
    setError(null);

    try {
      const { proof, publicSignals } = await generateProofFromInput(
        commitmentArray,
        mnemonic,
        groupId,
        epochId,
        proposalTitle,
        proposalDescription,
        proposalPayload,
        proposalFunding,
        proposalMetadata,
        "proposal"
      );

      console.log("[FRONTEND/useVerifyProposal] Proof generated:", proof);
      console.log(
        "[FRONTEND/useVerifyProposal] Public signals generated:",
        publicSignals
      );

      // publicSignals[0]: proposalContextHash
      // publicSignals[1]: proposalSubmissionNullifier (renamed from proposalNullifier)
      // publicSignals[2]: proposalClaimNullifier (new)
      // publicSignals[3]: root
      // publicSignals[4]: proposalContentHash

      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);

      console.log(
        "[FRONTEND/useVerifyProposal] Proof Solidity:",
        proofSolidity
      );
      console.log(
        "[FRONTEND/useVerifyProposal] Public Signals Solidity:",
        publicSignalsSolidity
      );

      console.log("[FRONTEND/useVerifyProposal] Data sent to relayer:", {
        proof: proofSolidity,
        publicSignals: publicSignalsSolidity,
        groupKey: groupId.toString(),
        epochKey: epochId.toString(),
      });

      console.log("Verifying proposal with relayer...");
      console.log("Group ID: ", groupId);
      console.log("Epoch ID: ", epochId);

      return await new Promise((resolve, reject) => {
        relayerVerifyProposal(
          {
            proof: proofSolidity,
            publicSignals: publicSignalsSolidity,
            groupKey: groupId.toString(),
            epochKey: epochId.toString(),
          },
          {
            onSuccess: (data) => {
              console.log("Relayer verification successful:", data);
              resolve({
                isValid: true,
                publicSignals,
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
      setError(err.message || "Failed to verify proposal");
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyProposal,
    isVerifying: isVerifying || isGeneratingProof,
    error,
  };
}
