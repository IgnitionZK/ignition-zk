// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// OZ Imports:
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces:
import {ITreasuryManager} from "../interfaces/ITreasuryManager.sol";

contract BeaconManager is Ownable {
    
    /**
     * @notice Emitted when the beacon implementation is updated.
     * @param implementation The address of the new beacon implementation.
     */
    event BeaconImplementationUpdated(address indexed implementation);

    /// @notice Stores the address of the beacon that points to the current implementation.
    UpgradeableBeacon public immutable beacon;


    constructor(
        address initialImplementation,
        address beaconOwner // ignitionZK multisig (or use relayer temporarily)
    ) {
        if (initialImplementation == address(0)) revert InvalidImplementation();
        beacon = new UpgradeableBeacon(initialImplementation);
        transferOwnership(beaconOwner);
    }

    
    function updateImplementation(address newImplementation) external onlyOwner {
        beacon.upgradeTo(newImplementation);
        emit BeaconImplementationUpdated(newImplementation);
    }

    function triggerEmergencyAccess(
        address treasury,
        address newdmin
    ) external onlyOwner {
        ITreasuryManager(treasury).emergencyAccessControl(newAdmin);
    }

}