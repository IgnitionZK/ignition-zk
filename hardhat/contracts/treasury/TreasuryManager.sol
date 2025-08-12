// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// OZ Imports:
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// Interfaces:
import { ITreasuryManager } from "../interfaces/treasury/ITreasuryManager.sol";
import { IVersioned } from "../interfaces/IVersioned.sol";

// Libraries:
import { FundingTypes } from "../libraries/FundingTypes.sol";
import { TreasuryTypes } from "../libraries/TreasuryTypes.sol";

/**
 * @title TreasuryManager
 * @notice This contract is responsible for managing the treasury of a DAO group.
 * @dev It includes functionalities for handling funds, managing roles, and interacting with other components of the DAO.
 */
contract TreasuryManager is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, ITreasuryManager, IVersioned {
// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
    
    // ====================================================================================================
    // FUNDING TYPE ERRORS
    // ====================================================================================================
    
    /// @notice Thrown if the provided funding type has an active module.
    error FundingTypeHasActiveModule();

    /// @notice Thrown if the provided funding type is not defined in the FundingTypes library.
    error UnknownFundingType();

    // ====================================================================================================
    // FUNDING MODULE ERRORS
    // ====================================================================================================
    
    /// @notice Thrown if the provided funding module address has already been granted the FUNDING_MODULE_ROLE.
    error ModuleAlreadyHasFundingRole();
    
    /// @notice Thrown if the funding module does not have the the FUNDING_MODULE_ROLE.
    error ModuleDoesNotHaveFundingRole();
    
    /// @notice Thrown if the provided funding module is not stored as an active module for the respective funding type.
    error ModuleMismatch();

    // ====================================================================================================
    // TRANSFER ERRORS
    // ====================================================================================================

    /// @notice Thrown if the treasury balance is lower than the requested transfer amount.
    error InsufficientBalance();

    /// @notice Thrown if a transfer request record for the specific contextKey already exists.
    error FundingAlreadyRequested();
    
    /// @notice Thrown if the transfer has already been approved.
    error TransferAlreadyApproved();

    /// @notice Thrown if the funds have already been transferred.
    error TransferAlreadyExecuted();

    /// @notice Thrown if the contextKey provided during transfer approval does not correspond to a pending transfer request.
    error RequestDoesNotExist();

    /// @notice Thrown if the fund transfer has failed.
    error TransferFailed();
    
    /// @notice Thrown if the transfer cannot be executed because it is in the timelock phase.
    error RequestInTimelock();
    
    /// @notice Thrown if the transfer amount is zero.
    error AmountCannotBeZero();

    /// @notice Thrown if the provided funding module is not consistent with the expected module.
    error InconsistentFundingModule();

    /// @notice Thrown if the pending transfer has not been approved.
    error TransferNotApproved();

    /// @notice Thrown if the timelock period for a transfer request has passed.
    error TimelockHasPassed();

    // ====================================================================================================
    // GENERAL ERRORS
    // ====================================================================================================
    
    /// @notice Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if the provided key (contextKey) is zero.
    error KeyCannotBeZero();

    /// @notice Thrown if a call is made to a function that does not exist in the contract.
    error FunctionDoesNotExist();

    /// @notice Thrown if the function call does not originate from either the FUNDING_MODULE_ROLE or the GOVERNANCE_MANAGER_ROLE.
    error CallerNotAuthorized();

    /// @notice Thrown if the provided address is not a contract.
    error AddressIsNotAContract();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================
    
    /**
     * @notice Emitted when funds are received by the treasury.
     * @dev This event is emitted whenever the treasury receives funds, either through the `fund` function or the `receive` function.
     * @param sender The address that sent the funds.
     * @param amount The amount of funds received.
     */
    event FundsReceived(address indexed sender, uint256 amount);

    /**
     * @notice Emitted when a new funding module is added.
     * @param fundingType The unique identifier of the funding type.
     * @param module The address of the funding module that was added.
     */
    event FundingModuleAdded(bytes32 indexed fundingType, address indexed module);

    /**
     * @notice Emitted when a funding module is removed.
     * @param module The address of the funding module that was removed.
     */
    event FundingModuleRemoved(bytes32 indexed fundingType, address indexed module);

    /**
     * @notice Emitted when a transfer request is made.
     * @param contextKey The unique identifier for the transfer request.
     * @param from The address (funding module contract address) that initiated the transfer request.
     * @param to The address that is the recipient of the transfer.
     * @param amount The amount of funds requested for transfer.
     */
    event TransferRequested(bytes32 indexed contextKey, address indexed from, address indexed to, uint256 amount);
    
    /**
     * @notice Emitted when a transfer is approved.
     * @param contextKey The unique identifier for the transfer request.
     * @param to The recipient address for the funds.
     * @param amount The amount of funds to be transferred.
     */
    event TransferApproved(bytes32 indexed contextKey, address indexed to, uint256 amount);

    /**
     * @notice Emitted when a transfer is executed.
     * @param contextKey The unique identifier for the transfer request.
     * @param to The address that received the funds.
     * @param amount The amount of funds that were transferred.
     */
    event TransferExecuted(bytes32 indexed contextKey, address indexed to, uint256 amount);

    /**
     * @notice Emitted when a transfer is cancelled.
     * @param contextKey The unique identifier for the transfer request.
     */
    event TransferCancelled(bytes32 indexed contextKey);
    
    /**
     * @notice Emitted when emergency access is granted to a new admin.
     * @param newAdmin The address of the new admin.
     * @dev Does not revoke the DEFAULT_ADMIN_ROLE from the previous admin.
     */
    event EmergencyAccessGranted(address indexed newAdmin);

    /**
     * @notice Emitted when the admin role is transferred to a new address.
     * @param oldAdmin The address of the previous admin.
     * @param newAdmin The address of the new admin.
     * @dev Revokes the DEFAULT_ADMIN_ROLE from the previous admin.
     */
    event AdminRoleTransferred(address indexed oldAdmin, address indexed newAdmin);
// ====================================================================================================================
//                                          STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================
    
    // ====================================================================================================
    // STRUCTS & ENUMS
    // ====================================================================================================
    
    /// @dev Struct representing a funding request.
    // Defined in libraries/TreasuryTypes.sol

    // ====================================================================================================
    // MAPPINGS
    // ====================================================================================================
    
    /// @dev Mapping of active funding modules.
    /// @dev The key is the unique identifier for the funding type, and the value is the address of the active funding module for that type.
    /// @dev This mapping is used to check which module is currently active for a specific funding type.
    mapping(bytes32 => address) private activeModuleRegistry;
    
    // TO-DO: Consider storing the active funding modules in an array and a mapping with enumeration
    // This would allow us to easily check the number of active funding modules and iterate over them if needed.
    
    /// @dev Mapping of unique context keys (context: group, epoch, proposal) to funding requests.
    mapping(bytes32 => TreasuryTypes.FundingRequest) private fundingRequests;

    // ====================================================================================================
    // CONSTANTS
    // ====================================================================================================

    /// @dev The role that grants access to funding modules.
    bytes32 private constant FUNDING_MODULE_ROLE = keccak256("FUNDING_MODULE_ROLE");

    /// @dev The role that grants access to the governance manager.
    bytes32 private constant GOVERNANCE_MANAGER_ROLE = keccak256("GOVERNANCE_MANAGER_ROLE");

    /// @dev The role that grants access to the beacon manager owner.
    bytes32 private constant EMERGENCY_RECOVERY_ROLE = keccak256("EMERGENCY_RECOVERY_ROLE");

    /// @dev The type identifiers for the different funding modules:
    // Imported from library FundingTypes.

    /// @dev The delay in days for the timelock mechanism.
    /// @dev This is used to prevent immediate execution of transfers after they are requested.
    /// @dev The value is set to 3 days, which is equivalent to 3 * 24 * 60 * 60 seconds.
    uint256 private constant TIMELOCK_DELAY_DAYS = 3;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Ensures that the provided address is not the zero address.
     * @param addr The address to check.
     */
    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) revert AddressCannotBeZero();
        _;
    }

    /**
     * @dev Ensures that the provided group key is not zero.
     * @param key The unique identifier for the group.
     */
    modifier nonZeroKey(bytes32 key) {
        if (key == bytes32(0)) revert KeyCannotBeZero();
        _;
    }

    /**
     * @dev Ensures that the caller has the DEFAULT_ADMIN_ROLE or the GOVERNANCE_MANAGER_ROLE.
     * This modifier is used to restrict access to certain functions to only the governor or default admin.
     */
    modifier onlyGovernorOrDefaultAdmin() {
        if ( 
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            !hasRole(GOVERNANCE_MANAGER_ROLE, msg.sender)
        ) revert CallerNotAuthorized();
        _;
    }

// ====================================================================================================================
//                                 CONSTRUCTOR / INITIALIZER 
// ====================================================================================================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();               
    }

    /**
     * @notice Initializes the Treasury contract.
     * @dev This function is called during the deployment of the contract to set up initial roles and funding types.
     * The initial owner is expected to be the GovernanceManager, which will later transfer ownership to the DAO multisig.
     * @param _initialOwner The address of the initial owner.
     * @param _governanceManager The address of the governance manager.
     * @param _grantModule The address of the grant funding module.
     * @custom:error AddressCannotBeZero Thrown if any of the provided addresses are zero.
     */
    function initialize(
        address _initialOwner, 
        address _governanceManager,
        address _grantModule, 
        address _beaconManager
    ) 
        external 
        initializer
        nonZeroAddress(_initialOwner)
        nonZeroAddress(_governanceManager)
        nonZeroAddress(_grantModule)
        nonZeroAddress(_beaconManager)
    {
        __AccessControl_init();
        __ReentrancyGuard_init(); 

        _grantRole(DEFAULT_ADMIN_ROLE, _initialOwner);
        _grantRole(GOVERNANCE_MANAGER_ROLE, _governanceManager);
        _grantRole(FUNDING_MODULE_ROLE, _grantModule);
        _grantRole(EMERGENCY_RECOVERY_ROLE, _beaconManager);

        // Initialize GRANT_TYPE in active module registry
        activeModuleRegistry[FundingTypes.GRANT_TYPE] = _grantModule; 
        emit FundingModuleAdded(FundingTypes.GRANT_TYPE, _grantModule);
    }   

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    // ====================================================================================================
    // ADMIN ROLE TRANSFER & EMERGENCY ACCESS
    // ====================================================================================================

    /**
     * @notice Transfers the DEFAULT_ADMIN_ROLE to a new address.
     * @dev This function can only be called by the current DEFAULT_ADMIN_ROLE.
     * It revokes the DEFAULT_ADMIN_ROLE from the previous admin and grants it to the new admin.
     * This is used to transfer ownership of the treasury management to a new admin, such as a DAO multisig.
     * @param _newAdmin The address of the new admin that will receive the DEFAULT_ADMIN_ROLE.
     * @custom:error AddressCannotBeZero Thrown if the provided address is zero.
     */
    function transferAdminRole(address _newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroAddress(_newAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);  
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);

        emit AdminRoleTransferred(msg.sender, _newAdmin);
    }

    /**
     * @notice Grants emergency access to a new admin.
     * @dev This function can only be called by the EMERGENCY_RECOVERY_ROLE.
     * It does not revoke the DEFAULT_ADMIN_ROLE from the previous admin.
     * @param _newAdmin The address of the new admin that will receive the DEFAULT_ADMIN_ROLE.
     * @custom:error AddressCannotBeZero Thrown if the provided address is zero.
     */
    function emergencyAccessControl(address _newAdmin) external onlyRole(EMERGENCY_RECOVERY_ROLE) nonZeroAddress(_newAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        emit EmergencyAccessGranted(_newAdmin);
    }

    // ====================================================================================================
    // REGISTERING FUNDING MODULES
    // ====================================================================================================
    
    /**
     * @notice Grants the funding module role to a new module and adds it to the active module registry for the specific funding type.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * It revokes the funding module role from the current module (if any) and assigns it to the new module.
     * @param _module The address of the funding module to be added.
     * @param _fundingType The unique identifier for the funding module type.
     * @custom:error InvalidFundingType Thrown if the provided funding type is not valid.
     */
    function addFundingModule(
        address _module, 
        bytes32 _fundingType
    ) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonZeroAddress(_module)
        nonZeroKey(_fundingType)
    {   
        if (!FundingTypes.isKnownType(_fundingType)) revert UnknownFundingType();
        if (hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleAlreadyHasFundingRole();
        if (_module.code.length == 0) revert AddressIsNotAContract();

        address currentModule = activeModuleRegistry[_fundingType];
        if (currentModule != address(0) && currentModule != _module) {
            _revokeRole(FUNDING_MODULE_ROLE, currentModule);
        }
        _grantRole(FUNDING_MODULE_ROLE, _module);

        activeModuleRegistry[_fundingType] = _module;
        emit FundingModuleAdded(_fundingType, _module);
    }

    /**
     * @notice Removes a funding module from the active module registry and revokes its funding module role.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * @param _module The address of the funding module to be removed.
     * @param _fundingType The unique identifier for the funding module type.
     * @custom:error ModuleDoesNotHaveFundingRole Thrown if the module does not have the FUNDING_MODULE_ROLE.
     * @custom:error ModuleMismatch Thrown if the provided module does not match the active module for the specified funding type.
     * @custom:error NonZeroAddress Thrown if the provided module address is zero.
     * @custom:error NonZeroKey Thrown if the provided funding type key is zero.
     */
    function removeFundingModule(
        address _module, 
        bytes32 _fundingType
    ) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonZeroAddress(_module)
        nonZeroKey(_fundingType)
    {
        if (!hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleDoesNotHaveFundingRole();
        if (activeModuleRegistry[_fundingType] != _module) revert ModuleMismatch();
        
        _revokeRole(FUNDING_MODULE_ROLE, _module); 
        delete activeModuleRegistry[_fundingType];
        emit FundingModuleRemoved(_fundingType, _module);
    }

    // ====================================================================================================
    // TRANSFER REQUESTS & APPROVALS
    // ====================================================================================================

    /**
     * @notice Requests a transfer of funds from the treasury to a specified address.
     * @dev This function can only be called by a funding module with the FUNDING_MODULE_ROLE.
     * It applies a timelock delay before the transfer can be executed.
     * @param contextKey The unique identifier for the transfer request.
     * @param _to The address that will receive the funds.
     * @param _amount The amount of funds to be transferred.
     * @param _fundingType The unique identifier for the funding type.
     * @custom:error InsufficientBalance Thrown if the treasury does not have enough balance to fulfill the transfer request.
     * @custom:error AmountCannotBeZero Thrown if the requested transfer amount is zero.
     * @custom:error FundingAlreadyRequested Thrown if a transfer request for the specified contextKey already exists.
     * @custom:error ModuleMismatch Thrown if the calling module does not match the active module for the specified funding type.
     * @custom:error AddressCannotBeZero Thrown if the recipient address is zero.
     * @custom:error KeyCannotBeZero Thrown if the contextKey is zero.
     */
    function requestTransfer(
        bytes32 contextKey,
        address _to, 
        uint256 _amount, 
        bytes32 _fundingType
    ) 
        external 
        onlyRole(FUNDING_MODULE_ROLE)
        nonZeroAddress(_to) 
        nonZeroKey(contextKey)
    {
        if (!FundingTypes.isKnownType(_fundingType)) revert UnknownFundingType();
        if (_amount == 0) revert AmountCannotBeZero();
        if (fundingRequests[contextKey].to != address(0)) revert FundingAlreadyRequested();
        if (activeModuleRegistry[_fundingType] != msg.sender) revert ModuleMismatch();

        fundingRequests[contextKey] = TreasuryTypes.FundingRequest({
            fundingType: _fundingType,
            from: msg.sender,
            to: _to,
            amount: _amount,
            requestedAt: block.timestamp,
            releaseTime: block.timestamp + TIMELOCK_DELAY_DAYS * 1 days,
            approved: false,
            executed: false
        });

        emit TransferRequested(contextKey, msg.sender, _to, _amount);
    }


    /**
     * @notice Approves a transfer request from the treasury to a specified address.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * A transfer can be approved even if the release time has not yet passed.
     * @param contextKey The unique identifier for the transfer request.
     * @custom:error RequestDoesNotExist Thrown if the transfer request for the specified contextKey does not exist.
     * @custom:error TransferAlreadyApproved Thrown if the transfer has already been approved.
     * @custom:error TransferAlreadyExecuted Thrown if the transfer has already been executed.
     * @custom:error InconsistentFundingModule Thrown if the active module for the specified funding type does not match the from address instance.
     * @custom:error AmountCannotBeZero Thrown if the requested transfer amount is zero.
     */
    function approveTransfer(bytes32 contextKey) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonZeroKey(contextKey) 
    {
        _approve(contextKey);
    }

    // Note: Consider making transfer execution permissionless 

    /**
     * @notice Executes a transfer request from the treasury to a specified address.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * It is non-reentrant to prevent re-entrancy attacks.
     * @param contextKey The unique identifier for the transfer request.
     * @custom:error RequestDoesNotExist Thrown if the transfer request for the specified contextKey does not exist.
     * @custom:error TransferNotApproved Thrown if the transfer has not been approved.
     * @custom:error TransferAlreadyExecuted Thrown if the transfer has already been executed.
     * @custom:error RequestInTimelock Thrown if the transfer request is still in the timelock phase and cannot be executed yet.
     * @custom:error InconsistentFundingModule Thrown if the active module for the specified funding type does not match the from address instance.
     * @custom:error InsufficientBalance Thrown if the treasury does not have enough balance to fulfill the transfer request.
     * @custom:error AmountCannotBeZero Thrown if the requested transfer amount is zero.
     */
    function executeTransfer(bytes32 contextKey) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonZeroKey(contextKey) 
        nonReentrant 
    {
        _execute(contextKey);
    }

    /**
     * @notice Approves and executes a transfer request in a single transaction.
     * @dev Transfer execution will fail if the funding request is still in timelock. 
     * @param contextKey The unique identifier for the transfer request.
     */
    function approveAndExecuteTransfer(bytes32 contextKey) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonZeroKey(contextKey) 
        nonReentrant 
    {   
        // to-do: skip approve if already approved
        _approve(contextKey);
        _execute(contextKey);
    }

    /**
     * @notice Cancels a transfer request.
     * @dev This function allows the admin to cancel a transfer request during timelock.
     * @param contextKey The unique identifier for the transfer request.
     * @custom:error RequestDoesNotExist Thrown if the requested transfer does not exist.
     * @custom:error TransferAlreadyExecuted Thrown if the transfer has already been executed.
     */
    function cancelTransfer(bytes32 contextKey) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroKey(contextKey) {
        TreasuryTypes.FundingRequest storage request = fundingRequests[contextKey];

        if (request.requestedAt == 0) revert RequestDoesNotExist();
        if (request.executed) revert TransferAlreadyExecuted();
        if (block.timestamp > request.releaseTime) revert TimelockHasPassed();

        delete fundingRequests[contextKey];
        emit TransferCancelled(contextKey);
    }

    // pull payment method:
    // TO DO: consider implementing a pull payment method for grants so that they are available for withdrawal.

    // ====================================================================================================
    // RECEIVING FUNDS
    // ====================================================================================================

    /**
     * @notice Funds the treasury with a specified amount.
     * @dev This function allows users to send ETH to the treasury.
     */
    function fund() external payable {
        if(msg.value == 0) revert AmountCannotBeZero();
        emit FundsReceived(msg.sender, msg.value);
    }

    /**
     * @notice Allows the contract to receive ETH directly.
     * @dev This function is called when the contract receives ETH without specifying a function.
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }


// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Returns the balance of the treasury.
     * @return The current balance of the treasury in wei.
     */
    function getBalance() external view onlyGovernorOrDefaultAdmin returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns the active module address for a specific funding type.
     * @param fundingType The unique identifier for the funding type.
     * @return The address of the active funding module for the specified funding type.
     */
    function getActiveModuleAddress(bytes32 fundingType) external view onlyGovernorOrDefaultAdmin returns (address) {
        if (!FundingTypes.isKnownType(fundingType)) revert UnknownFundingType();
        return activeModuleRegistry[fundingType];
    }

    /**
     * @notice Checks if a funding request is pending approval.
     * @param contextKey The unique identifier for the funding request.
     * @return True if the funding request is pending approval, false otherwise.
     */
    function isPendingApproval(bytes32 contextKey) external view onlyGovernorOrDefaultAdmin returns (bool) {
        return !fundingRequests[contextKey].approved && !fundingRequests[contextKey].executed;
    }

    /**
     * @notice Checks if a funding request is approved and pending execution.
     * @param contextKey The unique identifier for the funding request.
     * @return True if the funding request is pending execution, false otherwise.
     */
    function isPendingExecution(bytes32 contextKey) external view onlyGovernorOrDefaultAdmin returns (bool) {
        return fundingRequests[contextKey].approved && !fundingRequests[contextKey].executed;
    }

    /**
     * @notice Checks if a funding request has been executed.
     * @param contextKey The unique identifier for the funding request.
     * @return True if the funding request has been executed, false otherwise.
     */
    function isExecuted(bytes32 contextKey) external view onlyGovernorOrDefaultAdmin returns (bool) {
        return fundingRequests[contextKey].executed;
    }

    /**
     * @notice Retrieves the details of a funding request.
     * @param contextKey The unique identifier for the funding request.
     * @return The funding request details.
     */
    function getFundingRequest(bytes32 contextKey) external view onlyGovernorOrDefaultAdmin() returns (TreasuryTypes.FundingRequest memory) {
        return fundingRequests[contextKey];
    }

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view override(IVersioned, ITreasuryManager) onlyGovernorOrDefaultAdmin returns (string memory) {
        return "TreasuryManager v1.0.0"; 
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Approves a funding request.
     * @param contextKey The unique identifier for the funding request.
     */
    function _approve(bytes32 contextKey) private nonZeroKey(contextKey) {
        TreasuryTypes.FundingRequest storage request = fundingRequests[contextKey];

        // Checks
        if (request.requestedAt == 0) revert RequestDoesNotExist();
        if (request.approved) revert TransferAlreadyApproved();
        if (request.executed) revert TransferAlreadyExecuted();
        if (activeModuleRegistry[request.fundingType] != request.from) revert InconsistentFundingModule();
        if (request.amount == 0) revert AmountCannotBeZero();
        
        // Effects
        request.approved = true;
        emit TransferApproved(contextKey, request.to, request.amount);
    }

    /**
     * @dev Executes a funding request.
     * @param contextKey The unique identifier for the funding request.
     */
    function _execute(bytes32 contextKey) private nonZeroKey(contextKey) {
        TreasuryTypes.FundingRequest storage request = fundingRequests[contextKey];

        // Checks
        if (request.requestedAt == 0) revert RequestDoesNotExist();
        if (!request.approved) revert TransferNotApproved();
        if (request.executed) revert TransferAlreadyExecuted();
        if (request.releaseTime > block.timestamp) revert RequestInTimelock();
        if (activeModuleRegistry[request.fundingType] != request.from) revert InconsistentFundingModule();
        if (request.amount > address(this).balance) revert InsufficientBalance();
        if (request.amount == 0) revert AmountCannotBeZero();
        
        // Effects
        request.executed = true;

        // Interactions
        (bool success, ) = request.to.call{ value: request.amount }("");

        if (!success) {
            request.executed = false;
            revert TransferFailed();
        }

        emit TransferExecuted(contextKey, request.to, request.amount);
    }


// ====================================================================================================================
//                                       FALLBACK FUNCTION
// ====================================================================================================================

    /**
     * @notice Fallback function for handling calls to non-existent functions or when no data is sent.
     * @custom:error FunctionDoesNotExist Thrown if the called function does not exist.
     */
    fallback() external {
        revert FunctionDoesNotExist();
    }
}