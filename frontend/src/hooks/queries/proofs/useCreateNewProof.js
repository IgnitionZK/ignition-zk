import { useState } from "react";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";

/**

 * Custom hook for generating zero-knowledge proofs for the Ignition ZK system
 *
 * This hook provides functionality to generate ZK proofs for different circuit types:
 * - membership: Proof of membership in a group
 * - proposal: Proof of proposal submission
 * - vote: Proof of vote casting
 * - proposal-claim: Proof of proposal claim

 */
export const useGenerateProof = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [circuitInput, setCircuitInput] = useState(null);
  const [proof, setProof] = useState(null);

  /**
   * Generates circuit input from commitment array and mnemonic
   */
  const generateCircuitInput = async (
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
    setIsLoading(true);
    setError(null);

    try {
      const input = await ZKProofGenerator.generateProposalCircuitInput(
        mnemonic,
        commitmentArray,
        groupId,
        epochId,
        proposalTitle,
        proposalDescription,
        proposalPayload,
        proposalFunding,
        proposalMetadata
      );
      setCircuitInput(input);
      return input;
    } catch (err) {
      setError(err.message || "Failed to generate circuit input");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates a ZK proof from circuit input
   */
  const generateProof = async (circuitInput, circuitType) => {
    setIsLoading(true);
    setError(null);

    try {
      const { proof, publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        circuitType
      );
      setProof({ proof, publicSignals });
      return { proof, publicSignals };
    } catch (err) {
      setError(err.message || "Failed to generate proof");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates a complete proof from raw inputs
   */
  const generateProofFromInput = async (
    commitmentArray,
    mnemonic,
    groupId,
    epochId,
    proposalTitle,
    proposalDescription,
    proposalPayload,
    proposalFunding = {},
    proposalMetadata = {},
    circuitType
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const input = await generateCircuitInput(
        commitmentArray,
        mnemonic,
        groupId,
        epochId,
        proposalTitle,
        proposalDescription,
        proposalPayload,
        proposalFunding,
        proposalMetadata
      );

      const { proof, publicSignals } = await generateProof(input, circuitType);

      return { proof, publicSignals, circuitType };
    } catch (err) {
      setError(err.message || "Failed to generate proof from input");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates membership circuit input from commitment array and mnemonic
   */
  const generateMembershipCircuitInput = async (
    commitmentArray,
    mnemonic,
    groupId
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const input = await ZKProofGenerator.generateMembershipCircuitInput(
        mnemonic,
        commitmentArray,
        groupId
      );
      setCircuitInput(input);
      return input;
    } catch (err) {
      setError(err.message || "Failed to generate membership circuit input");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates a complete membership proof from raw inputs
   */
  const generateMembershipProofFromInput = async (
    commitmentArray,
    mnemonic,
    groupId
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const input = await generateMembershipCircuitInput(
        commitmentArray,
        mnemonic,
        groupId
      );

      const { proof, publicSignals } = await generateProof(input, "membership");

      return { proof, publicSignals, circuitType: "membership" };
    } catch (err) {
      setError(err.message || "Failed to generate membership proof from input");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates vote circuit input from commitment array and mnemonic

   */
  const generateVoteCircuitInput = async (
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
    setIsLoading(true);
    setError(null);

    try {
      const input = await ZKProofGenerator.generateVoteCircuitInput(
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
      setCircuitInput(input);
      return input;
    } catch (err) {
      setError(err.message || "Failed to generate vote circuit input");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates a complete vote proof from raw inputs

   */
  const generateVoteProofFromInput = async (
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
    setIsLoading(true);
    setError(null);

    try {
      // First generate the vote circuit input
      const input = await generateVoteCircuitInput(
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
      );

      const { proof, publicSignals } = await generateProof(input, "vote");

      return { proof, publicSignals, circuitType: "vote" };
    } catch (err) {
      setError(err.message || "Failed to generate vote proof from input");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateCircuitInput,
    generateMembershipCircuitInput,
    generateVoteCircuitInput,
    generateProof,
    generateProofFromInput,
    generateMembershipProofFromInput,
    generateVoteProofFromInput,
    isLoading,
    error,
    circuitInput,
    proof,
  };
};
