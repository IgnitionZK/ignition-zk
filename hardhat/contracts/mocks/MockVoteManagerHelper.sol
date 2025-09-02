// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../managers/VoteManager.sol";

/**
 * @title VoteManagerTestHelper
 * @notice Test helper that exposes private functions of VoteManager for testing
 */
contract MockVoteManagerHelper is VoteManager {
    
    /**
     * @notice Public wrapper for the private _linearInterpolation function
     * @param x The input value for interpolation
     * @return The interpolated quorum value
     */
    function exposed_linearInterpolation(uint256 x) public view returns (uint256) {
        // y = y1 + slope * (x  - x1)
        // slope = (y2 - y1) / (x2 - x1)
        uint256 yScalingFactor = 1e4; 
        uint256 x1 = quorumParams.minGroupSizeForMaxQuorum;
        uint256 y1Scaled = quorumParams.maxQuorumPercent * yScalingFactor;
        uint256 x2 = quorumParams.maxGroupSizeForMinQuorum;
        uint256 y2Scaled = quorumParams.minQuorumPercent * yScalingFactor;

        // x should be between x1 and x2
        if (x <= x1 || x >= x2) revert InvalidXInput();

        uint256 scalingFactor = 1e4;
        uint256 slopeNumeratorPositive = y1Scaled - y2Scaled;
        uint256 slopeDenominator =  x2 - x1;
        uint256 slopePositiveScaled = slopeNumeratorPositive * scalingFactor / slopeDenominator;

        uint256 quorumScaled = y1Scaled - (slopePositiveScaled * (x - x1)) / scalingFactor;
        return quorumScaled / scalingFactor;
    }
    
    /**
     * @notice Public wrapper for the private _ceilDiv function
     * @param a The numerator
     * @param b The denominator
     * @return The ceiling division result
     */
    function exposed_ceilDiv(uint256 a, uint256 b) public pure returns (uint256) {
        if (a == 0 || b == 0) revert InvalidCeilInputs();  
        return (a + b - 1) / b;
    }
    
    /**
     * @notice Public wrapper for the private _computePassedStatus function
     * @param params The group parameters
     * @param proposal The proposal result
     * @return Whether the proposal has passed
     */
    function exposed_computePassedStatus(
        VoteTypes.GroupParams memory params,
        VoteTypes.ProposalResult memory proposal
    ) public pure returns (bool) {
        uint256 totalVotes = proposal.tally.no + proposal.tally.yes + proposal.tally.abstain;
        if (totalVotes > params.memberCount) {
            // If total votes exceed member count, it indicates an error in tallying.
            // Reverting to prevent inconsistent state.
            revert TallyingInconsistent();
        }
        uint256 requiredVotes = exposed_ceilDiv(params.memberCount * params.quorum, 100);
        
        bool hasReachedQuorum = totalVotes >= requiredVotes;
        bool hasYesMajority = proposal.tally.yes > proposal.tally.no;
        bool hasMinimumMembers = params.memberCount >= 2;

        return hasReachedQuorum && hasYesMajority && hasMinimumMembers;
    }
}