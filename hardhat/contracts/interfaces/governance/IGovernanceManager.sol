// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IGovernanceManager
 * @notice Interface for the Governance Manager contract.
 */
interface IGovernanceManager {

    /**
     * @notice Gets the address of the active funding module for a specific funding type.
     * @param fundingType The unique identifier for the funding type.
     * @return address of the active funding module.
     */
    function activeModuleRegistry(bytes32 fundingType) external view returns (address);

}