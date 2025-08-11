// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ITreasuryManager
 * @notice Interface for the Treasury Manager contract.
 */
interface ITreasuryManager {

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Initializes the Treasury contract.
     * @param _initialOwner The address of the initial owner.
     * @param _governanceManager The address of the governance manager.
     * @param _grantModule The address of the grant funding module.
     */
    function initialize(
        address _initialOwner, 
        address _governanceManager,
        address _grantModule, 
        address _beaconManager
    ) external;

    /**
     * @notice Transfers the DEFAULT_ADMIN_ROLE to a new address.
     * @param _newAdmin The address of the new admin that will receive the DEFAULT_ADMIN_ROLE.
     */
    function transferAdminRole(address _newAdmin) external;

    /**
     * @notice Grants emergency access to a new admin.
     * @param _newAdmin The address of the new admin that will receive the DEFAULT_ADMIN_ROLE.
     */
    function emergencyAccessControl(address _newAdmin) external;

     /**
     * @notice Adds a new funding type to the valid funding types mapping.
     * @param _type The unique identifier for the funding type to be added.
     */
    function addFundingType(bytes32 _type) external;

    /**
     * @notice Removes a funding type from the valid funding types mapping.
     * @param _type The unique identifier for the funding type to be removed.
     */
    function removeFundingType(bytes32 _type) external;

    /**
     * @notice Grants the funding module role to a new module and adds it to the active module registry for the specific funding type.
     * @param _module The address of the funding module to be added.
     * @param _fundingType The unique identifier for the funding module type.
     */
    function addFundingModule(
        address _module, 
        bytes32 _fundingType
    ) external;

    /**
     * @notice Removes a funding module from the active module registry and revokes its funding module role.
     * @param _module The address of the funding module to be removed.
     * @param _fundingType The unique identifier for the funding module type.
     */
    function removeFundingModule(
        address _module, 
        bytes32 _fundingType
    ) external;

     /**
     * @notice Requests a transfer of funds from the treasury to a specified address.
     * @param contextKey The unique identifier for the transfer request.
     * @param _to The address that will receive the funds.
     * @param _amount The amount of funds to be transferred.
     * @param _fundingType The unique identifier for the funding type.
     */
    function requestTransfer(
        bytes32 contextKey,
        address _to, 
        uint256 _amount, 
        bytes32 _fundingType
    ) external;

    /**
     * @notice Approves and executes a transfer request from the treasury to a specified address.
     * @param contextKey The unique identifier for the transfer request.
     */
    function approveTransfer(
        bytes32 contextKey
    ) external;

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

     /**
     * @notice Returns the balance of the treasury.
     * @return The current balance of the treasury in wei.
     */
    function getBalance() external view returns (uint256);

    /**
     * @notice Returns the active module address for a specific funding type.
     * @param fundingType The unique identifier for the funding type.
     * @return The address of the active funding module for the specified funding type.
     */
    function getActiveModuleAddress(bytes32 fundingType) external view returns (address);

    /**
     * @notice Checks if a funding type is valid.
     * @param fundingType The unique identifier for the funding type.
     * @return True if the funding type is valid, false otherwise.
     */
    function isValidFundingType(bytes32 fundingType) external view returns (bool);

    /**
     * @notice Retrieves the current version of the MembershipManager contract.
     * @return The version string of the MembershipManager contract.
     */
    function getContractVersion() external view returns (string memory);
}