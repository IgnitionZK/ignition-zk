// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library TreasuryTypes {
    struct FundingRequest {
        bytes32 fundingType;
        address from;
        address to;
        uint256 amount;
        uint256 requestedAt;
        uint256 releaseTime;
        bool approved;
        bool executed;
    }
}