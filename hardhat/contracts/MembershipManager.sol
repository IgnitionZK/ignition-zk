// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MembershipManager {

    bytes32 public currentRoot;

    constructor(bytes32 initialRoot) {
        currentRoot = initialRoot;
    }

    function getRoot() external view returns (bytes32) {
        return currentRoot;
    }

    function updateRoot(bytes32 newRoot) external onlyRelayer {

        require(newRoot != bytes32(0), "Root cannot be zero");
        require(newRoot != currentRoot, "New root must be different from the current root");
        currentRoot = newRoot;
    }

    function verifyProof(uint256[24] calldata proof, uint256[2] calldata pubSignals) external view returns (bool) {
        require(currentRoot == pubSignals[0], "Invalid Merkle root");

    }

}