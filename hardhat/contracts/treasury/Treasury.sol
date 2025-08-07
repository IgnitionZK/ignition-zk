// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;


import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";


contract Treasury is Initializable, ContextUpgradeable, ERC721Upgradeable, AccessControlUpgradeable {
    
    enum FundingType { Grant, QuadraticFunding, Bounty }

    // mapping of funding type to its active module address
    // should only store one address per funding type. 
    // isActive will be set to true unless the role has been revoked and no new address for that funding type has yet been added
    // 
    mapping(FundingType => address) private activeModuleRegistry;

    struct FundingRequest {
        FundingType fundingType;
        address from;
        address to;
        uint256 amount;
        bool approved;
    }

    // contextKey => FundingRequest
    mapping(bytes32 => FundingRequest) private fundingRequests;

    uint256 private balance;

    bytes32 private constant FUNDING_MODULE_ROLE = keccak256("FUNDING_MODULE_ROLE");

    error AmountCannotBeZero();
    error InsufficientBalance();
    error AddressCannotBeZero();
    error FundingAlreadyRequested();
    error ModuleAlreadyHasFundingRole();
    error ModuleDoesNotHaveFundingRole();
    error ModuleMismatch();
    error InconsistentFundingModule();

    event Funded(address indexed sender, uint256 amount);
    event FundingModuleAdded(address indexed module);
    event FundingModuleRemoved(address indexed module);
    event FundingRequested(bytes32 contextKey, address index from, address indexed to, uint256 amount);


    modifier nonZeroAddress(address addr) {
        if(addr == address(0)) revert AddressCannotBeZero();
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();               // protects the template itself
    }

    function initialize(
        address _multiSig,
        address _grantModule
    ) 
        external 
        initializer
    {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSig);
        _grantRole(FUNDING_MODULE_ROLE, _grantModule);

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
    {
        // GM checks that a) context key exists in PM and that b) passed == true
        if (_amount > balance) revert InsufficientBalance();
        if (_amount == 0) revert AmountCannotBeZero();
        if (fundingRequests[contextKey].fundingType) revert FundingAlreadyRequested();
        if (activeModuleRegistry[_fundingType] != msg.sender) revert InconsistentFundingModule();

        fundingRequests[contextKey] = FundingRequest({
            fundingType: _fundingType,
            from: msg.sender,
            to: _to,
            amount: _amount,
            approved: false
        });

        emit FundingRequested(contextKey, msg.sender, _to, _amount);
    
    }

    // approveTransfer function

    // fund() function
    function fund() external payable {
        if(msg.value == 0) revert AmountCannotBeZero();
        balance += msg.value;

        emit Funded(msg.sender, msg.value);
    }

    // receive function

    receive() external payable {
        balance += msg.value;
        
        emit Funded(msg.sender, msg.value);
    }

    // fallback function



}