import { useState } from "react";
import { ZKProofGenerator } from "../../../scripts/generateZKProof";

export const useGenerateProof = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [circuitInput, setCircuitInput] = useState(null);
  const [proof, setProof] = useState(null);

  const generateCircuitInput = async (
    commitmentArray,
    mnemonic,
    externalNullifier
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const input = await ZKProofGenerator.generateCircuitInput(
        mnemonic,
        commitmentArray,
        externalNullifier
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

  const generateProof = async (circuitInput, circuitType = "membership") => {
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

  const generateProofFromInput = async (
    commitmentArray,
    mnemonic,
    externalNullifier,
    circuitType = "membership"
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // First generate the circuit input
      const input = await generateCircuitInput(
        commitmentArray,
        mnemonic,
        externalNullifier
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

  return {
    generateCircuitInput,
    generateProof,
    generateProofFromInput,
    isLoading,
    error,
    circuitInput,
    proof,
  };
};
