// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;


import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";


contract Treasury is Initializable, ContextUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    
    enum FundingType { Grant, QuadraticFunding, Bounty }

    // mapping of funding type to its active module address
    // should only store one address per funding type (only one module per funding type)
    mapping(FundingType => address) private activeModuleRegistry;

    struct FundingRequest {
        FundingType fundingType;
        address from;
        address to;
        uint256 amount;
        bool executed;
    }

    // contextKey => FundingRequest
    mapping(bytes32 => FundingRequest) private fundingRequests;

    bytes32 private constant FUNDING_MODULE_ROLE = keccak256("FUNDING_MODULE_ROLE");
    bytes32 private constant GOVERNANCE_MANAGER_ROLE = keccak256("GOVERNANCE_MANAGER_ROLE");

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


    event Funded(address indexed sender, uint256 amount);
    event FundingModuleAdded(address indexed module);
    event FundingModuleRemoved(address indexed module);
    event FundingRequested(bytes32 indexed contextKey, address indexed from, address indexed to, uint256 amount);
    event FundingTransferred(bytes32 indexed contextKey, address indexed to, uint256 amount);


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

        activeModuleRegistry[FundingType.Grant] = _grantModule;
    }   
    // add funding module
    function addFundingModule(address _module, FundingType _fundingType) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroAddress(_module) {
       
        if (hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleAlreadyHasFundingRole();
        _grantRole(FUNDING_MODULE_ROLE, _module);

        activeModuleRegistry[_fundingType] = _module;

        emit FundingModuleAdded(_module);
    }

    function removeFundingModule(address _module, FundingType _fundingType) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(FUNDING_MODULE_ROLE, _module)) revert ModuleDoesNotHaveFundingRole();
        _revokeRole(FUNDING_MODULE_ROLE, _module);

        if (activeModuleRegistry[_fundingType] != _module) revert ModuleMismatch();
        delete activeModuleRegistry[_fundingType];

        emit FundingModuleRemoved(_module);
    }

    // requestTransfer function
    function requestTransfer(
        bytes32 contextKey,
        address _to, 
        uint256 _amount, 
        FundingType _fundingType
    ) 
        external 
        onlyRole(FUNDING_MODULE_ROLE)
        nonZeroAddress(_to) 
        nonZeroKey(contextKey)
    {
        // GM checks that a) context key exists in PM and that b) passed == true
        if (_amount > address(this).balance) revert InsufficientBalance();
        if (_amount == 0) revert AmountCannotBeZero();
        if (fundingRequests[contextKey].to != address(0)) revert FundingAlreadyRequested();
        if (activeModuleRegistry[_fundingType] != msg.sender) revert InconsistentFundingModule();

        fundingRequests[contextKey] = FundingRequest({
            fundingType: _fundingType,
            from: msg.sender,
            to: _to,
            amount: _amount,
            executed: false
        });

        emit FundingRequested(contextKey, msg.sender, _to, _amount);
    
    }

    // push payment method:
    function transferFunding(
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

        emit FundingTransferred(contextKey, request.to, request.amount);
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