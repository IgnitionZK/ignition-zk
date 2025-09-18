//SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

interface IUpgradeable {
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
}