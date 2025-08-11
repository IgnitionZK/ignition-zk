// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IVersioned
 * @notice Interface for versioned contracts.
 */
interface IVersioned {

    /**
     * @notice Returns the current version of the contract.
     */
    function getContractVersion() external view returns (string memory);
}