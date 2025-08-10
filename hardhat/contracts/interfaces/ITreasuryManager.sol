// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITreasuryManager {

    function initialize(
        address _initialOwner, 
        address _governanceManager,
        address _grantModule
    ) external;
}