// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITreasuryFactory {

    /**
     * @notice Deploys new treasury instances for the DAO groups.
     * @param groupKey The unique group (DAO) identifier.
     * @param hasDeployedNft boolean indicating whether a group NFT exists.
     */
    function deployTreasury(
        bytes32 groupKey, 
        bool hasDeployedNft
    ) external;

    /**
     * @notice Returns the address of the treasury instance for a given group key.
     * @param groupKey The unique identifier for the DAO group.
     * @return The address of the treasury instance.
     */
    function getTreasuryAddress(bytes32 groupKey) external view returns (address);
}