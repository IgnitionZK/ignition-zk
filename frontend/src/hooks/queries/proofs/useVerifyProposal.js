import { useState } from "react";
import { useWalletQuery } from "../../wallet/useWalletQuery";
import { useGenerateProof } from "./useCreateNewProof";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";
import { ethers } from "ethers";
import { useRelayerVerifyProposal } from "../../relayers/useRelayerVerifyProposal";

// ABI for the ProposalVerifier contract
const PROPOSAL_VERIFIER_ABI = [
  "function verifyProof(uint256[24] calldata _proof, uint256[4] calldata _pubSignals) public view returns (bool)",
];

const PROPOSAL_VERIFIER_ADDRESS =
  "0x997172817177c1Aa125a0212B2c574c965174f9E";

/**
 * Custom hook for verifying proposal submission using zero-knowledge proofs
 * @returns {Object} An object containing the verification function and state
 * @property {Function} verifyProposal - Function to verify proposal submission
 * @property {boolean} isVerifying - Loading state for verification process
 * @property {string|null} error - Error message if verification fails
 */
export function useVerifyProposal() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { address, provider } = useWalletQuery();
  const { generateProofFromInput, isLoading: isGeneratingProof } =
    useGenerateProof();
  
  // Hook for verifying proposal
  const { verifyProposal: relayerVerifyProposal } = useRelayerVerifyProposal();

  /**
   * Verifies proposal submission using zero-knowledge proofs
   * @param {Array<number>} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase for proof generation
   * @param {string} groupId - Group ID for proof generation
   * @param {string} epochId - Epoch ID for proof generation
   * @param {string} proposalTitle - Title of the proposal
   * @param {string} proposalDescription - Description of the proposal
   * @param {string} proposalPayload - Payload of the proposal
   * @returns {Promise<{isValid: boolean, publicSignals: Array<number>}>} Object containing verification result and public signals
   * @throws {Error} If wallet is not connected or verification fails
   */
  const verifyProposal = async (
    commitmentArray,
    mnemonic,
    groupId,
    epochId,
    proposalTitle,
    proposalDescription,
    proposalPayload
  ) => {
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

    setIsVerifying(true);
    setError(null);

    try {
      // Generate the proof
      const { proof, publicSignals } = await generateProofFromInput(
        commitmentArray,
        mnemonic,
        groupId,
        epochId,
        proposalTitle,
        proposalDescription,
        proposalPayload
      );

      console.log("Proof: ", proof);
      console.log("Public Signals: ", publicSignals);
      // publicSignals[0]: proposalContextHash
      // publicSignals[1]: proposalNullifier
      // publicSignals[2]: root
      // publicSignals[3]: proposalContentHash
      

      // Convert proof and public signals to Solidity calldata
      const { proofSolidity, publicSignalsSolidity } =
        await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);
      console.log("Proof Solidity: ", proofSolidity);
      console.log("Public Signals Solidity: ", publicSignalsSolidity);

      // Create contract instance
      /*
      const contract = new ethers.Contract(
        PROPOSAL_VERIFIER_ADDRESS,
        PROPOSAL_VERIFIER_ABI,
        provider
      );
      */
      // Verify the proof using the relayer
      console.log("Verifying proposal with relayer...");
      console.log("Group ID: ", groupId);
      console.log("Epoch ID: ", epochId);

      return await new Promise((resolve, reject) => {
        relayerVerifyProposal(
          {
            proof: proofSolidity, 
            publicSignals: publicSignalsSolidity, 
            groupKey: groupId.toString(), // Convert to string as expected by edge function
            epochKey: epochId.toString(), // Convert to string as expected by edge function
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
