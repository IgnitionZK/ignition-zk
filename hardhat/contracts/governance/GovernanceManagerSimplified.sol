// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// interfaces
import "../interfaces/IMembershipManager.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// OpenZeppelin libraries
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title GovernanceManager
 * @dev Manages governance-related functions and access control.
 */

contract GovernanceManagerSimplified is Initializable, UUPSUpgradeable, OwnableUpgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================

    // Authorization errors:
    error OnlyRelayerAllowed();
    // General errors
    error AddressCannotBeZero();
    error NewRelayerMustBeDifferent();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

    /**
     * @notice Emitted when the relayer address is updated.
     * @param newRelayer The new address of the relayer.
     */
    event RelayerSet(address indexed newRelayer);

    /**
     * @notice Emitted when the membership manager address is updated.
     * @param newMembershipManager The new address of the membership manager.
     */
    event MembershipManagerSet(address indexed newMembershipManager);

// ====================================================================================================================
//                                                  LIBRARIES
// ====================================================================================================================

    using Address for address;

// ====================================================================================================================
//                                              STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================

    /// @dev The address of the designated relayer, authorized to update roots and verify proofs.
    address private relayer;
    /// @dev The address of the membership manager
    address private membershipManager;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Restricts function execution to the designated relayer address.
     */
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
        _;
    }

    /**
     * @dev Ensures that the provided address is not the zero address.
     * @param addr The address to check.
     */
    modifier nonZeroAddress(address addr) {
         if (addr == address(0)) revert AddressCannotBeZero();
         _;
    }

// ====================================================================================================================
//                                 CONSTRUCTOR / INITIALIZER / UPGRADE AUTHORIZATION
// ====================================================================================================================
    /**
     * @dev Initializes the contract with the initial owner, relayer, and membership manager addresses.
     * @param _initialOwner The address of the initial owner of the contract.
     * @param _relayer The address of the relayer, which must not be zero.
     * @param _membershipManager The address of the membership manager, which must not be zero.
     * @custom:error AddressCannotBeZero If any of the provided addresses are zero.
     */
    function initialize(
        address _initialOwner,
        address _relayer,
        address _membershipManager
    ) 
        external 
        initializer 
        nonZeroAddress(_initialOwner) 
        nonZeroAddress(_relayer) 
        nonZeroAddress(_membershipManager) 
    {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();

        relayer = _relayer;
        membershipManager = _membershipManager;

        emit RelayerSet(_relayer);
        emit MembershipManagerSet(_membershipManager);
    }

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Sets a new relayer address.
     * @dev Only the owner can call this function.
     * @param _relayer The new address for the relayer.
     * @custom:error AddressCannotBeZero If the provided relayer address is zero.
     * @custom:error NewRelayerMustBeDifferent If the new relayer address is the same as the current one.
     */
    function setRelayer(address _relayer) external onlyOwner nonZeroAddress(_relayer) {
        if (_relayer == relayer) revert NewRelayerMustBeDifferent();
        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================

    /**
     * @dev Forwards a call to another contract.
     * @param data The calldata to forward.
     * @param delegateTo The address to forward the call to.
     * example usage from the frontend:
     * ```
     * const mmIface = new ethers.utils.Interface(MembershipManagerABI);
     * const data = mmIface.encodeFunctionData("setRoot", [newRoot, groupKey]);
     * await governanceManager.forward(data);
     * ```
     */
    function delegate(
        bytes calldata data, 
        address delegateTo
    ) 
        external 
        onlyRelayer 
        nonZeroAddress(delegateTo)
        returns (bytes memory) 
    {
        return delegateTo.functionCall(data);
    }

// ====================================================================================================================
//                                   EXTERNAL VIEW FUNCTIONS (NOT FORWARDED)
// ====================================================================================================================

    /**
     * @notice Gets the address of the relayer.
     * @return address of the relayer.
     */
    function getRelayer() external view onlyOwner returns (address) {
        return relayer;
    }

    /**
     * @notice Gets the address of the membership manager.
     * @return address of the membership manager.
     */
    function getMembershipManager() external view onlyOwner returns (address) {
        return membershipManager;
    }

}