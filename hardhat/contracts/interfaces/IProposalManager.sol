// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProposalManager {
    // Functions
    function setProposalVerifier(address _verifier) external;
    function verifyProposal(
        uint256[24] calldata _proof,
        uint256[5] calldata _pubSignals,
        bytes32 _groupKey,
        bytes32 _epochKey
    ) external;

}