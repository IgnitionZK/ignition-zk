// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VoteTypes
 * @notice This library defines structs and enums related to voting.
 */
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

    /// @dev The proposal status struct, which contains the vote tally, a boolean indicating if the proposal has passed and the submission nullifier.
    /// Passed status is determined by the quorum and majority of votes.
    /// The submission nullifier is used to check proposal content validity when executing proposals.
    struct ProposalResult {
        VoteTally tally;
        bool passed;
        bytes32 submissionNullifier; 
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
     * @custom:note **Only append values in upgrades, do not alter order**
     */
    enum VoteChoice { No, Yes, Abstain }

}