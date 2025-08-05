import { useState } from "react";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";

/**
 * Custom hook for generating zero-knowledge proofs
 * @returns {Object} An object containing proof generation functions and state
 * @property {Function} generateCircuitInput - Generates circuit input from commitment array and mnemonic
 * @property {Function} generateProof - Generates a ZK proof from circuit input
 * @property {Function} generateProofFromInput - Generates a complete proof from raw inputs
 * @property {boolean} isLoading - Loading state indicator
 * @property {string|null} error - Error message if any
 * @property {Object|null} circuitInput - Generated circuit input
 * @property {Object|null} proof - Generated proof and public signals
 */
export const useGenerateProof = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [circuitInput, setCircuitInput] = useState(null);
  const [proof, setProof] = useState(null);

  /**
   * Generates circuit input from commitment array and mnemonic
   * @param {string[]} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} groupId - Group ID value
   * @param {string} epochId - Epoch ID value
   * @param {string} proposalTitle - Title of the proposal
   * @param {string} proposalDescription - Description of the proposal
   * @param {Object} proposalPayload - Payload of the proposal
   * @param {Object} proposalFunding - Funding information for the proposal
   * @param {Object} proposalMetadata - Metadata information for the proposal
   * @returns {Promise<Object>} Generated circuit input
   * @throws {Error} If circuit input generation fails
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
   * @param {Object} circuitInput - Circuit input object
   * @param {string} circuitType - Type of circuit to use
   * @returns {Promise<Object>} Object containing proof and public signals
   * @throws {Error} If proof generation fails
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
   * @param {string[]} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} groupId - Group ID value
   * @param {string} epochId - Epoch ID value
   * @param {string} proposalTitle - Title of the proposal
   * @param {string} proposalDescription - Description of the proposal
   * @param {string} proposalPayload - Payload of the proposal
   * @param {Object} proposalFunding - Funding information for the proposal
   * @param {Object} proposalMetadata - Metadata information for the proposal
   * @param {string} circuitType - Type of circuit to use
   * @returns {Promise<Object>} Object containing proof, public signals, and circuit type
   * @throws {Error} If proof generation fails
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
      // First generate the circuit input
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

      // Then generate the proof using the circuit input
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
   * @param {string[]} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} groupId - Group ID value
   * @returns {Promise<Object>} Generated circuit input
   * @throws {Error} If circuit input generation fails
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
   * @param {string[]} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} groupId - Group ID value
   * @returns {Promise<Object>} Object containing proof, public signals, and circuit type
   * @throws {Error} If proof generation fails
   */
  const generateMembershipProofFromInput = async (
    commitmentArray,
    mnemonic,
    groupId
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // First generate the membership circuit input
      const input = await generateMembershipCircuitInput(
        commitmentArray,
        mnemonic,
        groupId
      );

      // Then generate the proof using the circuit input
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
   * @param {string[]} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} groupId - Group ID value
   * @param {string} epochId - Epoch ID value
   * @param {string} proposalId - Proposal ID value
   * @param {number} voteChoice - Vote choice (0 for No, 1 for Yes, 2 for Abstain)
   * @param {string} proposalTitle - Proposal title
   * @param {string} proposalDescription - Proposal description
   * @param {Object} proposalPayload - Proposal payload object
   * @param {Object} proposalFunding - Proposal funding object
   * @param {Object} proposalMetadata - Proposal metadata object
   * @param {string} proposalSubmissionNullifier - Proposal submission nullifier hash
   * @returns {Promise<Object>} Generated circuit input
   * @throws {Error} If circuit input generation fails
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
   * @param {string[]} commitmentArray - Array of commitment values
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} groupId - Group ID value
   * @param {string} epochId - Epoch ID value
   * @param {string} proposalId - Proposal ID value
   * @param {number} voteChoice - Vote choice (0 for No, 1 for Yes, 2 for Abstain)
   * @param {string} proposalTitle - Proposal title
   * @param {string} proposalDescription - Proposal description
   * @param {Object} proposalPayload - Proposal payload object
   * @param {Object} proposalFunding - Proposal funding object
   * @param {Object} proposalMetadata - Proposal metadata object
   * @param {string} proposalSubmissionNullifier - Proposal submission nullifier hash
   * @returns {Promise<Object>} Object containing proof, public signals, and circuit type
   * @throws {Error} If proof generation fails
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

      // Then generate the proof using the circuit input
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
