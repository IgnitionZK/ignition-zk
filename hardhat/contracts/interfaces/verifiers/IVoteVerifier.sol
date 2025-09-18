// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

/**
 * @title IVoteVerifier
 * @notice Interface for verifying zero-knowledge proofs related to voting
 */
interface IVoteVerifier {

    /**
     * @notice Verifies a zero-knowledge proof for vote verification
     * @param _proof The proof data array containing 24 elements
     * @param _pubSignals The public signals array containing 5 elements: voteContextHash, voteNullifier, onChainVerifiableVoteChoiceHash, root, proposalSubmissionNullifier
     * @return bool Returns true if the proof is valid, false otherwise
     */
    function verifyProof(
        uint256[24] calldata _proof, 
        uint256[5] calldata _pubSignals
    ) external view returns (bool);

}
