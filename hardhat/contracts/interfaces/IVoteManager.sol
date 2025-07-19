// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVoteManager {

    // Enums
    enum VoteChoice { Yes, No, Abstain }

    /**
     * @notice Sets the address of the vote verifier contract.
     * @param _voteVerifier The address of the new vote verifier contract.
     */
    function setVoteVerifier(address _voteVerifier) external;

    /**
     * @notice Verifies a zk-SNARK proof for a vote.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     * @param groupKey The unique identifier for the voting group.
     * @param currentRoot The current Merkle root from the MembershipManager contract.
     * @param choice The vote choice (Yes, No, Abstain).
     */
    function verifyVote(
        uint256[24] calldata proof,
        uint256[4] calldata publicSignals,
        bytes32 contextKey,
        bytes32 groupKey,
        bytes32 currentRoot,
        VoteChoice choice
    ) external;

    /**
     * @notice Sets the member count for a voting group.
     * @param groupKey The unique identifier for the voting group.
     * @param _memberCount The number of members in the voting group.
     */
    function setMemberCount(bytes32 groupKey, uint256 _memberCount) external;
   
}