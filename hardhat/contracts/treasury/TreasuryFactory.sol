// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITreasuryManager} from "./ITreasuryManager.sol"; 

contract TreasuryFactory is Ownable {

    error GroupTreasuryAlreadyExists();
    error GroupNftNotSet();

    event TreasuryDeployed(bytes32 indexed groupKey, address clone);

    mapping(bytes32 => address) private groupTreasuryAddresses;

    address private immutable beacon;
    address private immutable governanceManager;
    address private immutable grantModule;

    constructor(
        address _beacon,
        address _governanceManager,
        address _grantModule
    ) 
        nonZeroAddress(_beacon) 
        nonZeroAddress(_governanceManager)
        nonZeroAddress(_grantModule) 
    {
        beacon = _beacon;
        governanceManager = _governanceManager;
        grantModule = _grantModule;

        transferOwnership(_governanceManager);
    }


    function deployTreasury(
        bytes32 groupKey, 
        bool hasDeployedNft
    ) 
        external 
        onlyOwner 
        nonZeroKey(groupKey) 
    {

        if (groupTreasuryAddresses[groupKey] != address(0)) revert GroupTreasuryAlreadyExists();
        if (!hasDeployedNft) revert GroupNftNotSet();

        bytes memory initData = abi.encodeWithSelector(
            ITreasuryManager.initialize.selector,
            governanceManager, // initialOwner with DEFAULT_ADMIN_ROLE
            governanceManager, // GOVERNANCE_MANAGER_ROLE
            grantModule, // grant funding module with FUNDING_MODULE_ROLE
            beacon // beacon manager for EMERGENCY_RECOVERY_ROLE
        );

        // creates non-deterministic addresses
        BeaconProxy treasuryProxy = new BeaconProxy(
            beacon, 
            initData
        );

        address treasury = address(treasuryProxy);
        groupTreasuryAddresses[groupKey] = treasury;

        emit TreasuryDeployed(groupKey, treasury);
    }

    function getTreasuryAddress(bytes32 groupKey) external view onlyOwner returns (address) {
        return groupTreasuryAddresses[groupKey];
    }



}


