// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IGrantModule {

    function distributeGrant(
        address groupTreasury,
        bytes32 contextKey,
        address to,
        uint256 amount
    ) external; 
}