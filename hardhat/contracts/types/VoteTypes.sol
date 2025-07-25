// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library VoteTypes {
    /// @dev The vote tally struct, which contains the counts of abstain, yes, and no votes.
    struct VoteTally {
        uint256 no;
        uint256 yes;
        uint256 abstain;
    }

    /// @dev The GroupParams struct, which contains the member count and quorum percentage for a group.
    struct GroupParams {
        uint256 memberCount;
        uint256 quorum;
    }

    /// @dev The proposal status struct, which contains the vote tally and a boolean indicating if the proposal has passed.
    /// Passed status is determined by the quorum and majority of votes.
    struct ProposalResult {
        VoteTally tally;
        bool passed;
    }

    /// @dev The QuorumParams struct, which contains the minimum and maximum quorum thresholds and group size parameters.
    struct QuorumParams {
        uint256 minQuorumPercent;
        uint256 maxQuorumPercent;
        uint256 maxGroupSizeForMinQuorum;
        uint256 minGroupSizeForMaxQuorum;
    }

    /**
     * @notice Represents the different choices a voter can make.
     */
    enum VoteChoice { No, Yes, Abstain }

}