// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProposalManager {
    // Functions
    function setProposalVerifier(address _verifier) external;
    function getProposalVerifier() external view returns (address);
    function getProposalNullifierStatus(bytes32 nullifier) external view returns (bool);
    function getProposalSubmission(bytes32 contextKey) external view returns (bytes32);
    function verifyProposal(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals,
        bytes32 _contextKey, 
        bytes32 _currentRoot
    ) external;

}