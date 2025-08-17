// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// OZ Imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// Interfaces:
import { ITreasuryManager } from "../interfaces/treasury/ITreasuryManager.sol";
import { IGrantModule } from "../interfaces/fundingModules/IGrantModule.sol";
import { IVersioned } from "../interfaces/IVersioned.sol";

// Libraries:
import { FundingTypes } from "../libraries/FundingTypes.sol";

/**
 * @title GrantModule
 * @notice This contract is responsible for requesting funding for grant proposals.
 */
contract MockGrantModuleWithReceive is Initializable, UUPSUpgradeable, OwnableUpgradeable, IGrantModule, IVersioned {

    /// @dev Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @dev Thrown if the provided key is zero.
    error KeyCannotBeZero();

    /**
     * @dev Emitted when a grant is requested.
     * @param groupTreasury The address of the group treasury contract.
     * @param contextKey The unique identifier for the grant context (group + epoch + proposal).
     * @param to The address to receive the grant.
     * @param amount The amount of the grant.
     */
    event GrantRequested(address indexed groupTreasury, bytes32 indexed contextKey, address indexed to, uint256 amount);

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

// ====================================================================================================================
//                                 CONSTRUCTOR / INITIALIZER / UPGRADE AUTHORIZATION
// ====================================================================================================================

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); 
    }

    /**
     * @dev Initializes the contract with the initial owner and treasury manager addresses.
     * @param _owner The address of the initial owner of the contract.
     */
    function initialize(
        address _owner // GovernanceManager
    ) 
        external 
        initializer 
        nonZeroAddress(_owner)
    {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

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
    ) 
        external 
        onlyOwner
        nonZeroKey(contextKey)
        nonZeroAddress(groupTreasury)
        nonZeroAddress(to) 
    {
        // Checks in funding module: 
        // GM checks that 
        // a) context key exists in VM and
        // b) passed == true 
        // !!! submission nullifier corresponds to voted contextKey in VM
       
        ITreasuryManager(groupTreasury).requestTransfer(
            contextKey,
            to,
            amount,
            FundingTypes.GRANT_TYPE
        );
        emit GrantRequested(groupTreasury, contextKey, to, amount);
    }

// ====================================================================================================================
//                           EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view override(IVersioned, IGrantModule) onlyOwner returns (string memory) {
        return "GrantModule v1.0.0"; 
    }

    receive() external payable {}
}