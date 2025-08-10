// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";


contract TreasuryManager is Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
    
    // ====================================================================================================
    // FUNDING TYPE ERRORS
    // ====================================================================================================
    
    /// @notice Thrown if the provided funding type is not present in the mapping of valid funding types.
    error FundingTypeDoesNotExist();

    /// @notice Thrown if the provided funding type has an active module.
    error FundingTypeHasActiveModule();

    /// @notice Thrown if the funding type is already valid.
    /// @dev This error is thrown when trying to add a funding type that already exists in the validFundingTypes mapping.
    error FundingTypeAlreadyValid();

    // ====================================================================================================
    // FUNDING MODULE ERRORS
    // ====================================================================================================
    
    /// @notice Thrown if the provided funding module address has already been granted the FUNDING_MODULE_ROLE.
    error ModuleAlreadyHasFundingRole();
    
    /// @notice Thrown if the funding module does not have the the FUNDING_MODULE_ROLE.
    error ModuleDoesNotHaveFundingRole();
    
    /// @notice Thrown if the provided funding module is not stored as an active module for the respective funding type.
    error ModuleMismatch();
    
    /// @notice Thrown if the funding type is already valid.
    /// @dev This error is thrown when trying to add a funding type that already exists in the validFundingTypes mapping.
    error FundingTypeAlreadyValid();

    // ====================================================================================================
    // TRANSFER ERRORS
    // ====================================================================================================

    /// @notice Thrown if the treasury balance is lower than the requested transfer amount.
    error InsufficientBalance();

    /// @notice Thrown if a transfer request record for the specific contextKey already exists.
    error FundingAlreadyRequested();
    
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
     * @notice Emitted when a new funding type is added as a valid funding type.
     * @param type The unique identifier of the funding type.
     */
    event FundingTypeAdded(bytes32 type);

    /**
     * @notice Emitted when a funding type is removed from the valid funding types.
     * @param type The unique identifier of the funding type that was removed.
     */
    event FundingTypeRemoved(bytes32 type);

    /**
     * @notice Emitted when a new funding module is added.
     * @param module The address of the funding module that was added.
     */
    event FundingModuleAdded(address indexed module);

    /**
     * @notice Emitted when a funding module is removed.
     * @param module The address of the funding module that was removed.
     */
    event FundingModuleRemoved(address indexed module);

    /**
     * @notice Emitted when a transfer request is made.
     * @param contextKey The unique identifier for the transfer request.
     * @param from The address (funding module contract address) that initiated the transfer request.
     * @param to The address that is the recipient of the transfer.
     * @param amount The amount of funds requested for transfer.
     */
    event TransferRequested(bytes32 indexed contextKey, address indexed from, address indexed to, uint256 amount);
    
    /**
     * @notice Emitted when a transfer is approved and executed.
     * @param contextKey The unique identifier for the transfer request.
     * @param to The address that received the funds.
     * @param amount The amount of funds that were transferred.
     */
    event TransferApproved(bytes32 indexed contextKey, address indexed to, uint256 amount);

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
    struct FundingRequest {
        bytes32 fundingType;
        address from;
        address to;
        uint256 amount;
        uint256 releaseTime;
        bool executed;
    }

    // ====================================================================================================
    // MAPPINGS
    // ====================================================================================================
    
    /// @dev Mapping of valid funding types.
    /// @dev The key is the unique identifier for the funding type, and the value is a boolean indicating whether the funding type is valid.
    /// @dev This mapping is used to check if a funding type is valid before allowing granting the FUNDING_MODULE_ROLE to an address.
    mapping(bytes32 => bool) private validFundingTypes;

    // TO-DO: Consider storing the valid funding types in an array and a mapping with enumeration
    // This would allow us to easily check the number of valid funding types and iterate over them if needed.

    /// @dev Mapping of active funding modules.
    /// @dev The key is the unique identifier for the funding type, and the value is the address of the active funding module for that type.
    /// @dev This mapping is used to check which module is currently active for a specific funding type.
    mapping(bytes32 => address) private activeModuleRegistry;
    
    // TO-DO: Consider storing the active funding modules in an array and a mapping with enumeration
    // This would allow us to easily check the number of active funding modules and iterate over them if needed.
    
    /// @dev Mapping of unique context keys (context: group, epoch, proposal) to funding requests.
    mapping(bytes32 => FundingRequest) private fundingRequests;

    // ====================================================================================================
    // ADDRESSES
    // ====================================================================================================

    // ====================================================================================================
    // CONSTANTS
    // ====================================================================================================

    /// @dev The role that grants access to funding modules.
    bytes32 private constant FUNDING_MODULE_ROLE = keccak256("FUNDING_MODULE_ROLE");

    /// @dev The role that grants access to the governance manager.
    bytes32 private constant GOVERNANCE_MANAGER_ROLE = keccak256("GOVERNANCE_MANAGER_ROLE");

    /// @dev The role that grants access to the beacon manager owner.
    bytes32 private constant EMERGENCY_RECOVERY_ROLE = keccak256("EMERGENCY_RECOVERY_ROLE");

    
    /// @dev The type identifiers for the different funding modules.
    bytes32 private constant GRANT_TYPE = keccak256("grant");
    bytes32 private constant QUADRATIC_FUNDING_TYPE = keccak256("quadratic_funding");
    bytes32 private constant BOUNTY_TYPE = keccak256("bounty");
    bytes32 private constant STREAMING_PAYMENTS_TYPE = keccak256("streaming_payments");
    bytes32 private constant EMERGENCY_TRANSFER_TYPE = keccak256("emergency_transfer");

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
//                                 CONSTRUCTOR / INITIALIZER / UPGRADE AUTHORIZATION
// ====================================================================================================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();               
    }

    /**
     * @notice Initializes the Treasury contract.
     * @dev This function is called during the deployment of the contract to set up initial roles and funding types.
     * @param _initialOwner The address of the initial owner.
     * @param _governanceManager The address of the governance manager.
     * @param _grantModule The address of the grant funding module.
     * @dev The initial owner is expected to be the GovernanceManager, which will later transfer ownership to the DAO multisig.
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
        _grantRole(EMERGENCY_RECOVERY_ROLE, _beaconManager)

        validFundingTypes[GRANT_TYPE] = true;
        validFundingTypes[QUADRATIC_FUNDING_TYPE] = true;
        validFundingTypes[BOUNTY_TYPE] = true;
        validFundingTypes[STREAMING_PAYMENTS_TYPE] = true;
        validFundingTypes[EMERGENCY_TRANSFER_TYPE] = true;

        emit FundingTypeAdded(GRANT_TYPE);
        emit FundingTypeAdded(QUADRATIC_FUNDING_TYPE);
        emit FundingTypeAdded(BOUNTY_TYPE);
        emit FundingTypeAdded(STREAMING_PAYMENTS_TYPE);
        emit FundingTypeAdded(EMERGENCY_TRANSFER_TYPE);
        
        activeModuleRegistry[GRANT_TYPE] = _grantModule; 
        emit FundingModuleAdded(_grantModule);
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
     * @notice Adds a new funding type to the valid funding types mapping.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * @param _type The unique identifier for the funding type to be added.
     */
    function addFundingType(bytes32 _type) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroKey(_type) {
        if (validFundingTypes[_type]) revert FundingTypeAlreadyValid();
        validFundingTypes[_type] = true;
        emit FundingTypeAdded(_type);
    }

    /**
     * @notice Removes a funding type from the valid funding types mapping.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * @param _type The unique identifier for the funding type to be removed.
     */
    function removeFundingType(bytes32 _type) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroKey(_type) {
        if (!validFundingTypes[_type]) revert FundingTypeDoesNotExist();
        if ( activeModuleRegistry[_type] != address(0) ) revert FundingTypeHasActiveModule();
        delete validFundingTypes[_type];
        emit FundingTypeRemoved(_type);
    }

    /**
     * @notice Grants the funding module role to a new module and adds it to the active module registry for the specific funding type.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
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
        if (!validFundingTypes[_fundingType]) revert FundingTypeDoesNotExist();
        if (hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleAlreadyHasFundingRole();
        if (_module.code.length == 0) revert AddressIsNotAContract();
        _grantRole(FUNDING_MODULE_ROLE, _module);

        activeModuleRegistry[_fundingType] = _module;
        emit FundingModuleAdded(_module);
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
        emit FundingModuleRemoved(_module);
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
        // Checks in funding module: 
        // GM checks that 
        // a) context key exists in VM and
        // b) passed == true 
        // c) submission nullifier corresponds to voted contextKey in VM
        // c) recipient is in whitelist contract 
        // If passed, requests transfer
        // Checks in Treasury:
        if (_amount > address(this).balance) revert InsufficientBalance();
        if (_amount == 0) revert AmountCannotBeZero();
        if (fundingRequests[contextKey].to != address(0)) revert FundingAlreadyRequested();
        if (activeModuleRegistry[_fundingType] != msg.sender) revert ModuleMismatch();

        fundingRequests[contextKey] = FundingRequest({
            fundingType: _fundingType,
            from: msg.sender,
            to: _to,
            amount: _amount,
            releaseTime: block.timestamp + TIMELOCK_DELAY_DAYS * 24 * 60 * 60,
            executed: false
        });

        emit TransferRequested(contextKey, msg.sender, _to, _amount);
    }

    /**
     * @notice Approves and executes a transfer request from the treasury to a specified address.
     * @dev This function can only be called by the DEFAULT_ADMIN_ROLE.
     * It checks the conditions for executing the transfer, such as the release time and sufficient balance.
     * If the transfer is successful, it emits a TransferApproved event.
     * @param contextKey The unique identifier for the transfer request.
     * @custom:error RequestDoesNotExist Thrown if the transfer request for the specified contextKey does not exist.
     * @custom:error TransferAlreadyExecuted Thrown if the transfer has already been executed.
     * @custom:error RequestInTimelock Thrown if the transfer request is still in the timelock phase and cannot be executed yet.
     * @custom:error InconsistentFundingModule Thrown if the active module for the specified funding type does not match the from address instance.
     * @custom:error InsufficientBalance Thrown if the treasury does not have enough balance to fulfill the transfer request.
     * @custom:error AmountCannotBeZero Thrown if the requested transfer amount is zero.
     * @custom:error TransferFailed Thrown if the transfer to the recipient address fails.
     * @custom:note This function is non-reentrant to prevent re-entrancy attacks.
     */
    function approveTransfer(
        bytes32 contextKey
    ) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonZeroKey(contextKey)
        nonReentrant
    {
        FundingRequest storage request = fundingRequests[contextKey];

        // Checks
        if (request.to == address(0)) revert RequestDoesNotExist();
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

        emit TransferApproved(contextKey, request.to, request.amount);
    }

    // pull payment method:

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

    // ====================================================================================================
    // FALLBACK
    // ====================================================================================================

    /**
     * @notice Fallback function for handling calls to non-existent functions or when no data is sent.
     * @custom:error FunctionDoesNotExist Thrown if the called function does not exist.
     */
    fallback() external {
        revert FunctionDoesNotExist();
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
        return activeModuleRegistry[fundingType];
    }

    /**
     * @notice Checks if a funding type is valid.
     * @param fundingType The unique identifier for the funding type.
     * @return True if the funding type is valid, false otherwise.
     */
    function isValidFundingType(bytes32 fundingType) external view onlyGovernorOrDefaultAdmin returns (bool) {
        return validFundingTypes[fundingType];
    }


}