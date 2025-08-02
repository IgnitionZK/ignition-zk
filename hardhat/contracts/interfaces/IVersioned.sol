// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVersioned {
    function getContractVersion() external view returns (string memory);
}