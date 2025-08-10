// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// OZ Imports:
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces:
import {ITreasuryManager} from "../interfaces/treasury/ITreasuryManager.sol";


contract BeaconManager is Ownable {

    /// @dev Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /**
     * @notice Emitted when the beacon implementation is updated.
     * @param implementation The address of the new beacon implementation.
     */
    event BeaconImplementationUpdated(address indexed implementation);

    /// @notice Stores the address of the beacon that points to the current implementation.
    UpgradeableBeacon public immutable beacon;

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

// ====================================================================================================================
//                                 CONSTRUCTOR
// ====================================================================================================================
    
    /**
     * @dev Initializes the beacon manager with the initial implementation and beacon owner.
     * @param initialImplementation The address of the initial implementation contract of the TreasuryManager.
     * @param beaconOwner The address of the beacon owner (IgnitionZK multisig but use relayer in development).
     */
    constructor(
        address initialImplementation,
        address beaconOwner 
    ) 
        Ownable(beaconOwner)
        nonZeroAddress(initialImplementation) 
        nonZeroAddress(beaconOwner) 
    {
        // Set the BeaconManager contract as the beacon owner.
        // This allows the BeaconManager to control the beacon's implementation.
        beacon = new UpgradeableBeacon(initialImplementation, address(this));
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Points the beacon to a new implementation.
     * @param newImplementation The address of the new implementation to set.
     * @dev Only callable by the owner (IgnitionZK multisig or relayer during development).
     */
    function updateImplementation(address newImplementation) external onlyOwner nonZeroAddress(newImplementation) {
        beacon.upgradeTo(newImplementation);
        emit BeaconImplementationUpdated(newImplementation);
    }

    /**
     * @notice Triggers emergency access to the treasury.
     * @dev This function can only be called by the owner (IgnitionZK multisig or relayer during development).
     * It allows the owner to set a new admin for the treasury.
     * @param treasury The address of the treasury instance. 
     * @param newAdmin The address to grant DEFAULT_ADMIN_ROLE to.
     */
    function triggerEmergencyAccess(
        address treasury,
        address newAdmin
    ) 
        external 
        onlyOwner 
        nonZeroAddress(newAdmin) 
    {
        ITreasuryManager(treasury).emergencyAccessControl(newAdmin);
    }

}