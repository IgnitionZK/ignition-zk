// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Interfaces:
import { IProposalVerifier } from "../verifiers/IProposalVerifier.sol";
import { IProposalClaimVerifier } from "../verifiers/IProposalClaimVerifier.sol";

/**
 * @title IProposalManager
 * @notice Interface for the Proposal Manager contract.
 */
interface IProposalManager {
    
// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Sets the address of the proposal submission verifier contract.
     * @param _submissionVerifier The address of the new proposal submission verifier contract.
     */
    function setProposalSubmissionVerifier(address _submissionVerifier) external;

    /**
     * @notice Sets the address of the proposal claim verifier contract.
     * @param _claimVerifier The address of the new proposal claim verifier contract.
     */
    function setProposalClaimVerifier(address _claimVerifier) external;

    /**
     * @notice Verifies a zk-SNARK proof for a proposal submission.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     * @param groupKey The identifier of the group.
     */
    function verifyProposal(
        uint256[24] calldata proof,
        uint256[5] calldata publicSignals,
        bytes32 contextKey, 
        //bytes32 currentRoot
        bytes32 groupKey
    ) external;

    /**
     * @notice Verifies a zk-SNARK proof for a proposal claim.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     */
    function verifyProposalClaim(
        uint256[24] calldata proof,
        uint256[3] calldata publicSignals,
        bytes32 contextKey
    ) external;

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================
     
    /**
     * @notice Returns the address of the proposal submission verifier contract.
     * @return address of the proposal submission verifier contract.
     */
    function submissionVerifier() external view returns (IProposalVerifier);

    /**
     * @notice Returns the address of the proposal claim verifier contract.
     * @return address of the proposal claim verifier contract.
     */
    function claimVerifier() external view returns (IProposalClaimVerifier);

    /**
     * @notice Returns the submission nullifier status for a given nullifier.
     * @param nullifier The submission nullifier to check.
     * @return bool indicating whether the submission nullifier has been used.
     */
    function submissionNullifiers(bytes32 nullifier) external view returns (bool);

    /**
     * @notice Returns the claim nullifier status for a given nullifier.
     * @param nullifier The claim nullifier to check.
     * @return bool indicating whether the claim nullifier has been used.
     */
    function claimNullifiers(bytes32 nullifier) external view returns (bool);

    /**
     * @notice Retrieves the current version of the ProposalManager contract.
     * @return The version string of the ProposalManager contract.
     */
    function getContractVersion() external view returns (string memory);
    
}