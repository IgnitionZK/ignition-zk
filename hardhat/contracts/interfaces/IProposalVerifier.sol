// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IProposalVerifier
 * @notice Interface for verifying zero-knowledge proofs related to proposal submissions
 */
interface IProposalVerifier {
    /**
     * @notice Verifies a zero-knowledge proof for proposal verification
     * @param _proof The proof data array containing 24 elements
     * @param _pubSignals The public signals array containing 5 elements: proposalContextHash, proposalSubmissionNullifier, proposalClaimNullifier, root, and proposalContentHash
     * @return bool Returns true if the proof is valid, false otherwise
     */
    function verifyProof(
        uint256[24] calldata _proof,
        uint256[5] calldata _pubSignals
    ) external view returns (bool);
} 