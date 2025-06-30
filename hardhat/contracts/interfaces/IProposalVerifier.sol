// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProposalVerifier {
    /**
     * @notice Verifies a zero-knowledge proof for membership verification
     * @param _proof The proof data array containing 24 elements
     * @param _pubSignals The public signals array containing 5 elements: proposalNullifier, groupHash, epochHash, root, proposalContentHash
     * @return bool Returns true if the proof is valid, false otherwise
     */
    function verifyProof(
        uint256[24] calldata _proof,
        uint256[5] calldata _pubSignals
    ) external view returns (bool);
} 