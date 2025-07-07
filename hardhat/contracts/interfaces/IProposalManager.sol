// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProposalManager {
    
// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Sets the address of the proposal verifier contract.
     * @dev This function can only be called by the contract owner (governor).
     * @param _verifier The address of the new proposal verifier contract.
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     */
    function setProposalVerifier(address _verifier) external;

    /**
     * @notice Verifies a zk-SNARK proof for a proposal submission.
     * @dev This function can only be called by the contract owner (governor).
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     * @param currentRoot The current Merkle root from the MembershipManager contract.
     * @custom:error InvalidProof If the proof is invalid.
     * @custom:error NullifierAlreadyUsed If the nullifier has already been used.
     * @custom:error InvalidContextHash If the context hash does not match the expected value.
     * @custom:error InvalidMerkleRoot If the provided Merkle root does not match the expected root.
     * @custom:error RootNotYetInitialized If the Merkle root has not been initialized for the group.
     * @custom:error KeyCannotBeZero If the provided context key is zero.
     */
    function verifyProposal(
        uint256[24] calldata proof,
        uint256[4] calldata publicSignals,
        bytes32 contextKey, 
        bytes32 currentRoot
    ) external;

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================
     
     /**
     * @notice Returns the address of the proposal verifier contract.
     * @dev Only callable by the owner (governor).
     * @return address of the proposal verifier contract.
     */
    function getProposalVerifier() external view returns (address);

    /**
     * @notice Returns the nullifier status for a given nullifier.
     * @param nullifier The nullifier to check.
     * @return bool indicating whether the nullifier has been used.
     */
    function getProposalNullifierStatus(bytes32 nullifier) external view returns (bool);

    /**
     * @notice Returns the content hash of a proposal submission for a given context key.
     * @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
     * @return bytes32 The content hash of the proposal submission.
     */
    function getProposalSubmission(bytes32 contextKey) external view returns (bytes32);
    
    

}