// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMembershipVerifier	
 * @notice Interface for verifying zero-knowledge proofs related to membership claims
 */
interface IMembershipVerifier {

    /**
     * @notice Verifies a zero-knowledge proof for membership verification
     * @param _proof The proof data array containing 24 elements
     * @param _pubSignals The public signals array containing 2 elements: root and groupHash
     * @return bool Returns true if the proof is valid, false otherwise
     */
    function verifyProof(
        uint256[24] calldata _proof, 
        uint256[2] calldata _pubSignals
    ) external view returns (bool);

}