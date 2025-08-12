// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title FundingTypes
 * @notice This library defines the different types of funding modules available in the system.
 */
library FundingTypes {

    /// @dev The type identifiers for the different funding modules.
    bytes32 internal constant GRANT_TYPE              = keccak256("grant");
    bytes32 internal constant QUADRATIC_FUNDING_TYPE  = keccak256("quadratic_funding");
    bytes32 internal constant BOUNTY_TYPE             = keccak256("bounty");
    bytes32 internal constant STREAMING_PAYMENTS_TYPE = keccak256("streaming_payments");
    bytes32 internal constant EMERGENCY_TRANSFER_TYPE = keccak256("emergency_transfer");

    /**
     * @notice Checks if the provided funding type is valid.
     * @param fundingType The funding type to check.
     * @return True if the funding type is valid, false otherwise.
     */
    function isKnownType(bytes32 fundingType) internal pure returns (bool) {
        return fundingType == GRANT_TYPE ||
               fundingType == QUADRATIC_FUNDING_TYPE ||
               fundingType == BOUNTY_TYPE ||
               fundingType == STREAMING_PAYMENTS_TYPE ||
               fundingType == EMERGENCY_TRANSFER_TYPE;
    }

}