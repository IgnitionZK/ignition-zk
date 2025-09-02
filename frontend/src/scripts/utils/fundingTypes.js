import { ethers } from "ethers";

/**
 * Funding type constants that match the smart contract FundingTypes library
 * These are the keccak256 hashes of the funding type strings
 */
export const FUNDING_TYPES = {
  GRANT: ethers.keccak256(ethers.toUtf8Bytes("grant")),
  QUADRATIC_FUNDING: ethers.keccak256(ethers.toUtf8Bytes("quadratic_funding")),
  BOUNTY: ethers.keccak256(ethers.toUtf8Bytes("bounty")),
  STREAMING_PAYMENTS: ethers.keccak256(
    ethers.toUtf8Bytes("streaming_payments")
  ),
  EMERGENCY_TRANSFER: ethers.keccak256(
    ethers.toUtf8Bytes("emergency_transfer")
  ),
};

/**
 * Maps frontend funding type strings to their corresponding bytes32 values
 */
export const FUNDING_TYPE_MAP = {
  grant: FUNDING_TYPES.GRANT,
  lumpsumpayment: FUNDING_TYPES.GRANT, // Default to grant for lump sum payments
  quadratic_funding: FUNDING_TYPES.QUADRATIC_FUNDING,
  bounty: FUNDING_TYPES.BOUNTY,
  streaming_payments: FUNDING_TYPES.STREAMING_PAYMENTS,
  emergency_transfer: FUNDING_TYPES.EMERGENCY_TRANSFER,
};

/**
 * Gets the bytes32 funding type from a proposal's funding data
 * @param {Object} funding - The funding object from the proposal
 * @param {string} funding.type - The funding type string
 * @returns {string} The bytes32 funding type
 */
export function getFundingTypeFromProposal(funding) {
  if (!funding || !funding.type) {
    console.warn("No funding type found in proposal, defaulting to GRANT");
    return FUNDING_TYPES.GRANT;
  }

  const fundingTypeString = funding.type.toLowerCase();
  const fundingType = FUNDING_TYPE_MAP[fundingTypeString];

  if (!fundingType) {
    console.warn(
      `Unknown funding type: ${fundingTypeString}, defaulting to GRANT`
    );
    return FUNDING_TYPES.GRANT;
  }

  return fundingType;
}

/**
 * Validates if a funding type is known
 * @param {string} fundingType - The bytes32 funding type to validate
 * @returns {boolean} True if the funding type is valid
 */
export function isValidFundingType(fundingType) {
  return Object.values(FUNDING_TYPES).includes(fundingType);
}

/**
 * Gets the human-readable name for a funding type
 * @param {string} fundingType - The bytes32 funding type
 * @returns {string} The human-readable name
 */
export function getFundingTypeName(fundingType) {
  const entries = Object.entries(FUNDING_TYPES);
  const entry = entries.find(([name, value]) => value === fundingType);
  return entry ? entry[0] : "Unknown";
}
