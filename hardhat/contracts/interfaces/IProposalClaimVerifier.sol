// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProposalClaimVerifier {
    /**
     * @notice Verifies a zero-knowledge proof for proposal ownership claim verification
     * @param _proof The proof data array containing 24 elements
     * @param _pubSignals The public signals array containing 4 elements: proposalContextHash, proposalSubmissionNullifier, proposalClaimNullifier, and root
     * @return bool Returns true if the proof is valid, false otherwise
     */
    function verifyProof(
        uint256[24] calldata _proof,
        uint256[3] calldata _pubSignals
    ) external view returns (bool);
} 