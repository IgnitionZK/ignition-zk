// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ITreasuryFactory
 * @notice Interface for the Treasury Factory contract.
 */
interface ITreasuryFactory {

    /**
     * @notice Deploys new treasury instances for the DAO groups.
     * @param groupKey The unique group (DAO) identifier.
     * @param treasuryMultiSig The address of the treasury multi-signature wallet.
     * @param treasuryRecovery The address of the treasury recovery wallet.
     */
    function deployTreasury(
        bytes32 groupKey, 
        address treasuryMultiSig,
        address treasuryRecovery
    ) external;

    /**
     * @notice Returns the address of the treasury instance for a given group key.
     * @param groupKey The unique identifier for the DAO group.
     * @return The address of the treasury instance.
     */
    function groupTreasuryAddresses(bytes32 groupKey) external view returns (address);

    /**
     * @notice Emitted when a treasury instance has been deployed.
     * @param groupKey The unique identifier for the DAO group.
     * @param beaconProxy The address of the deployed treasury instance.
     */
    event TreasuryDeployed(bytes32 indexed groupKey, address beaconProxy);

    /**
     * @notice Emitted when the treasury factory is deployed.
     * @param beaconManager The address of the beacon manager contract.
     * @param governanceManager The address of the governance manager contract.
     */
    event TreasuryFactoryDeployed(address indexed beaconManager, address indexed governanceManager);
}