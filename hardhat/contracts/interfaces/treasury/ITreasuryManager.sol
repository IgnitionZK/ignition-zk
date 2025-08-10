// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITreasuryManager {

    function initialize(
        address _initialOwner, 
        address _governanceManager,
        address _grantModule, 
        address _beaconManager
    ) external;

    function transferAdminRole(address _newAdmin) external;

    function emergencyAccessControl(address _newAdmin) external;

    function addFundingType(bytes32 _type) external;

    function removeFundingType(bytes32 _type) external;

    function addFundingModule(
        address _module, 
        bytes32 _fundingType
    ) external;

    function removeFundingModule(
        address _module, 
        bytes32 _fundingType
    ) external;

    function requestTransfer(
        bytes32 contextKey,
        address _to, 
        uint256 _amount, 
        bytes32 _fundingType
    ) external;

    function approveTransfer(
        bytes32 contextKey
    ) external;

    function getBalance() external view returns (uint256);

    function getActiveModuleAddress(bytes32 fundingType) external view returns (address);

    function isValidFundingType(bytes32 fundingType) external view returns (bool);
}