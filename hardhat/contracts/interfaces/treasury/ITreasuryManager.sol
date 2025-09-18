// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

import { TreasuryTypes } from "../../libraries/TreasuryTypes.sol";

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
     * @param _treasuryMultiSig The address of the treasury multi-signature wallet.
     * @param _governanceManager The address of the governance manager.
     * @param _treasuryRecovery The address of the treasury recovery contract.
     */
    function initialize(
        address _treasuryMultiSig,
        address _governanceManager,
        address _treasuryRecovery
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
     * @notice Locks the treasury, preventing any further withdrawals.
     */
    function lockTreasury() external;

    /**
     * @notice Unlocks the treasury, allowing withdrawals to resume.
     */
    function unlockTreasury() external;
    
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
    function approveTransfer(bytes32 contextKey) external;

    /**
     * @notice Executes a transfer request from the treasury to a specified address.
     * @param contextKey The unique identifier for the transfer request.
     */
    function executeTransfer(bytes32 contextKey) external;

    /**
     * @notice Approves and executes a transfer request from the treasury to a specified address.
     * @param contextKey The unique identifier for the transfer request.
     */
    function approveAndExecuteTransfer(bytes32 contextKey) external;

    /**
     * @notice Cancels a transfer request from the treasury to a specified address.
     * @param contextKey The unique identifier for the transfer request.
     */
    function cancelTransfer(bytes32 contextKey) external;

    /**
     * @notice Funds the treasury contract.
     */
    function fund() external payable;

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

     /**
     * @notice Returns the balance of the treasury.
     * @return The current balance of the treasury in wei.
     */
    function getBalance() external view returns (uint256);

    /**
     * @notice Checks if an address has the default admin role.
     * @param addr The address to check.
     * @return True if the address has the default admin role, false otherwise.
     */
    function hasDefaultAdminRole(address addr) external view returns (bool);

    /**
     * @notice Checks if an address has the governance manager role.
     * @param addr The address to check.
     * @return True if the address has the governance manager role, false otherwise.
     */
    function hasGovernanceManagerRole(address addr) external view returns (bool);

    /**
     * @notice Checks if an address has the emergency recovery role.
     * @param addr The address to check.
     * @return True if the address has the emergency recovery role, false otherwise.
     */
    function hasEmergencyRecoveryRole(address addr) external view returns (bool);

    /**
     * @notice Checks if a transfer request is pending approval.
     * @param contextKey The unique identifier for the transfer request.
     * @return True if the transfer request is pending approval, false otherwise.
     */
    function isPendingApproval(bytes32 contextKey) external view returns (bool);

    /**
     * @notice Checks if a transfer request is pending execution.
     * @param contextKey The unique identifier for the transfer request.
     * @return True if the transfer request is pending execution, false otherwise.
     */
    function isPendingExecution(bytes32 contextKey) external view returns (bool);

    /**
     * @notice Checks if a transfer request has been executed.
     * @param contextKey The unique identifier for the transfer request.
     * @return True if the transfer request has been executed, false otherwise.
     */
    function isExecuted(bytes32 contextKey) external view returns (bool);

    /**
     * @notice Retrieves the funding request details for a specific transfer request.
     * @param contextKey The unique identifier for the transfer request.
     * @return The funding request details for the specified transfer request.
     */
    function getFundingRequest(bytes32 contextKey) external view returns (TreasuryTypes.FundingRequest memory);

    /**
     * @notice Checks if the treasury is currently locked.
     * @return True if the treasury is locked, false otherwise.
     */
    function isLocked() external view returns (bool);

    /**
     * @notice Retrieves the current version of the MembershipManager contract.
     * @return The version string of the MembershipManager contract.
     */
    function getContractVersion() external view returns (string memory);
}