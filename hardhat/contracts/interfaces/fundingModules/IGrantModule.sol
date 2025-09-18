// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

/**
 * @title IGrantModule
 * @notice Interface for the Grant Module contract.
 */
interface IGrantModule {

    /**
     * @notice Distributes a grant to a specified address from a group treasury.
     * @param groupTreasury The address of the group treasury contract.
     * @param contextKey The unique identifier for the grant context (group + epoch + proposal).
     * @param to The address to receive the grant.
     * @param amount The amount of the grant.
     */
    function distributeGrant(
        address groupTreasury,
        bytes32 contextKey,
        address to,
        uint256 amount
    ) external; 

    /**
     * @notice Retrieves the current version of the MembershipManager contract.
     * @return The version string of the MembershipManager contract.
     */
    function getContractVersion() external view returns (string memory);
}