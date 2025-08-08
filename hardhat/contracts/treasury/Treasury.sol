// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;


import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";


contract Treasury is Initializable, ContextUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    
    //enum FundingType { Grant, QuadraticFunding, Bounty, Vesting, StreamingPayments, Emergency }

    // mapping of funding type to its active module address
    // should only store one address per funding type (only one module per funding type)
    mapping(bytes32 => address) private activeModuleRegistry;
    mapping(bytes32 => bool) private validFundingTypes;
    
    struct FundingRequest {
        bytes32 fundingType;
        address from;
        address to;
        uint256 amount;
        uint256 releaseTime;
        bool executed;
    }

    // contextKey => FundingRequest
    mapping(bytes32 => FundingRequest) private fundingRequests;

    bytes32 private constant FUNDING_MODULE_ROLE = keccak256("FUNDING_MODULE_ROLE");
    bytes32 private constant GOVERNANCE_MANAGER_ROLE = keccak256("GOVERNANCE_MANAGER_ROLE");

    bytes32 private constant GRANT_TYPE = keccak256("grant");
    bytes32 private constant QUADRATIC_FUNDING_TYPE = keccak256("quadratic_funding");
    bytes32 private constant BOUNTY_TYPE = keccak256("bounty");

    uint256 private constant TIMELOCK_DELAY_DAYS = 3;

    error AmountCannotBeZero();
    error InsufficientBalance();
    error AddressCannotBeZero();
    error KeyCannotBeZero();
    error FundingAlreadyRequested();
    error ModuleAlreadyHasFundingRole();
    error ModuleDoesNotHaveFundingRole();
    error ModuleMismatch();
    error InconsistentFundingModule();
    error TransferAlreadyExecuted();
    error RequestDoesNotExist();
    error TransferFailed();
    error FunctionDoesNotExist();
    error CallerNotAuthorized();
    error InvalidFundingType();
    error RequestInTimelock();

    event Funded(address indexed sender, uint256 amount);
    event FundingModuleAdded(address indexed module);
    event FundingModuleRemoved(address indexed module);
    event TransferRequested(bytes32 indexed contextKey, address indexed from, address indexed to, uint256 amount);
    event TransferApproved(bytes32 indexed contextKey, address indexed to, uint256 amount);


    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) revert AddressCannotBeZero();
        _;
    }

    modifier nonZeroKey(bytes32 key) {
        if (key == bytes32(0)) revert KeyCannotBeZero();
        _;
    }

    modifier onlyGovernorOrDefaultAdmin() {
        if ( 
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            !hasRole(GOVERNANCE_MANAGER_ROLE, msg.sender)
        ) revert CallerNotAuthorized();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();               
    }

    function initialize(
        address _multiSig,
        address _governanceManager,
        address _grantModule
    ) 
        external 
        initializer
    {
        __AccessControl_init();
        __ReentrancyGuard_init(); 

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSig);
        _grantRole(FUNDING_MODULE_ROLE, _grantModule);
        _grantRole(GOVERNANCE_MANAGER_ROLE, _governanceManager);

        validFundingTypes[GRANT_TYPE] = true;
        activeModuleRegistry[GRANT_TYPE] = _grantModule; 
    }   

    // add funding type
    function addFundingType(bytes32 _type) external onlyRole(DEFAULT_ADMIN_ROLE) {
        validFundingTypes[_type] = true;
    }

    // remove funding type
    function removeFundingType(bytes32 _type) external onlyRole(DEFAULT_ADMIN_ROLE) {
        validFundingTypes[_type] = false;
    }


    // add funding module
    function addFundingModule(address _module, bytes32 _fundingType) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroAddress(_module) {
        
        if (!validFundingTypes[_fundingType]) revert InvalidFundingType();
        if (hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleAlreadyHasFundingRole();
        _grantRole(FUNDING_MODULE_ROLE, _module);

        activeModuleRegistry[_fundingType] = _module;

        emit FundingModuleAdded(_module);
    }

    function removeFundingModule(address _module, bytes32 _fundingType) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleDoesNotHaveFundingRole();
        if (activeModuleRegistry[_fundingType] != _module) revert ModuleMismatch();
        _revokeRole(FUNDING_MODULE_ROLE, _module);
        delete activeModuleRegistry[_fundingType];

        emit FundingModuleRemoved(_module);
    }

    // requestTransfer function
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
        if (activeModuleRegistry[_fundingType] != msg.sender) revert InconsistentFundingModule();

        fundingRequests[contextKey] = FundingRequest({
            fundingType: _fundingType,
            from: msg.sender,
            to: _to,
            amount: _amount,
            releaseTime: block.timestamp + TIMELOCK_DELAY_DAYS * 24 * 60 * 60;
            executed: false
        });

        emit TransferRequested(contextKey, msg.sender, _to, _amount);
    }

    // push payment method:
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

    // fund() function
    function fund() external payable {
        if(msg.value == 0) revert AmountCannotBeZero();
        emit Funded(msg.sender, msg.value);
    }

    // receive function (Metamask transfers, transfers without specifying a particular function)
    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    // fallback function
    fallback() external {
        revert FunctionDoesNotExist();
    }

    function getBalance() external view onlyGovernorOrDefaultAdmin returns (uint256) {
        return address(this).balance;
    }


}