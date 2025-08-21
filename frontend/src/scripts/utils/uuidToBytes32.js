import { ethers } from "ethers";

/**
 * Converts a UUID string to bytes32 format using the same method as the ZK proof generation
 * This ensures consistency between frontend, backend, and smart contract operations
 *
 * @param {string} uuid - The UUID string to convert
 * @returns {string} The bytes32 hex string with 0x prefix
 */
export const uuidToBytes32 = (uuid) => {
  if (!uuid || typeof uuid !== "string") {
    throw new Error("UUID must be a non-empty string");
  }

  const FIELD_MODULUS = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  const hash = BigInt(ethers.keccak256(ethers.toUtf8Bytes(uuid)));
  const reduced = hash % FIELD_MODULUS;
  return ethers.toBeHex(reduced, 32);
};

/**
 * Converts a UUID string to BigInt format for ZK circuit inputs
 * This is used internally by the ZK proof generation
 *
 * @param {string} uuid - The UUID string to convert
 * @returns {bigint} The BigInt representation
 */
export const uuidToBigInt = (uuid) => {
  if (!uuid || typeof uuid !== "string") {
    throw new Error("UUID must be a non-empty string");
  }

  const FIELD_MODULUS = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  const hash = BigInt(ethers.keccak256(ethers.toUtf8Bytes(uuid)));
  return hash % FIELD_MODULUS;
};
