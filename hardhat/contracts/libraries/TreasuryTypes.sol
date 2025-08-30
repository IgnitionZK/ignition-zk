// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TreasuryTypes
 * @notice This library defines the data structures used in the treasury management system.
 */
library TreasuryTypes {
    /// @dev Represents a request for funding within the treasury system.
    struct FundingRequest {
        bytes32 fundingType;
        address from;
        address to;
        uint256 amount;
        uint256 requestedAt;
        uint256 releaseTime;
        bool approved;
        bool executed;
        bool cancelled;
    }
}