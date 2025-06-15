//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IMembershipVerifier
 * @dev Interface for a zk-SNARK membership verifier.
 */
interface IMembershipVerifier {
    /**
     * @notice Verifies a zk-SNARK proof for membership in a Merkle tree.
     * @param proof The zk-SNARK proof data.
     * @param pubSignals Public signals including the nullifier and the Merkle root.
     * @return True if the proof is valid, false otherwise.
     */
    function verifyProof(
        uint256[24] calldata proof, 
        uint256[2] calldata pubSignals
        ) external view returns (bool);
}