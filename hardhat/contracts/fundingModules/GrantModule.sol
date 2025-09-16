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
 * @dev The GrantModule is a stateless contract that accepts calls from the GovernanceManager and forwards them to the relevant treasury instance.
 */
contract GrantModule is Initializable, UUPSUpgradeable, OwnableUpgradeable, IGrantModule, IVersioned {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================

    /// @notice Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if the provided key is zero.
    error KeyCannotBeZero();

    /// @notice Thrown if ETH is sent to this contract.
    error ETHTransfersNotAccepted();

    /// @notice Thrown when a function not defined in this contract is called.
    error UnknownFunctionCall();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

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
     * @param owner The address of the initial owner of the contract.
     */
    function initialize(
        address owner // GovernanceManager
    ) 
        external 
        initializer 
        nonZeroAddress(owner)
    {
        __Ownable_init(owner);
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
        ITreasuryManager(groupTreasury).requestTransfer(
            contextKey,
            to,
            amount,
            FundingTypes.GRANT_TYPE
        );
        emit GrantRequested(groupTreasury, contextKey, to, amount);
    }

// ====================================================================================================================
//                                       RECEIVE & FALLBACK FUNCTIONS
// ====================================================================================================================

    /**
    * @notice Prevents ETH from being sent to this contract
    */
    receive() external payable {
        revert ETHTransfersNotAccepted();
    }

    /**
    * @notice Prevents ETH from being sent with calldata to this contract
    * @dev Handles unknown function calls and ETH transfers with data
    */
    fallback() external payable {
        if (msg.value > 0) {
            revert ETHTransfersNotAccepted();
        } else {
            revert UnknownFunctionCall();
        }
    }

// ====================================================================================================================
//                           EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view override(IVersioned, IGrantModule) returns (string memory) {
        return "GrantModule v1.0.0"; 
    }

}