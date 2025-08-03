// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../types/VoteTypes.sol";

interface IVoteManager {

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
    * @param isProposalSubmitted A boolean indicating whether the proposal has been submitted and verified.
     */
    function verifyVote(
        uint256[24] calldata proof,
        uint256[5] calldata publicSignals,
        bytes32 contextKey,
        bytes32 groupKey,
        bytes32 currentRoot,
        bool isProposalSubmitted
    ) external;

    /**
     * @notice Sets the member count for a voting group.
     * @param groupKey The unique identifier for the voting group.
     * @param _memberCount The number of members in the voting group.
     */
    function setMemberCount(bytes32 groupKey, uint256 _memberCount) external;

    /**
     * @notice Sets the quorum parameters for a voting group.
     * @param _minQuorumPercent The minimum quorum percentage value that can be used.
     * @param _maxQuorumPercent The maximum quorum percentage value that can be used.
     * @param _maxGroupSizeForMinQuorum The maximum group size for which the minimum quorum percentage applies.
     * @param _minGroupSizeForMaxQuorum The minimum group size for which the maximum quorum percentage applies.
     */
    function setQuorumParams(
        uint256 _minQuorumPercent,
        uint256 _maxQuorumPercent,
        uint256 _maxGroupSizeForMinQuorum,
        uint256 _minGroupSizeForMaxQuorum
    ) external;

    /**
     * @notice Gets the address of the vote verifier contract.
     * @return The address of the vote verifier contract.
     */
    function getVoteVerifier() external view returns (address);

    /**
     * @notice Gets the vote nullifier status.
     * @param nullifier The vote nullifier to check.
     * @return The status of the vote nullifier (true if used, false if not).
     */
    function getVoteNullifierStatus(bytes32 nullifier) external view returns (bool);

    /**
     * @notice Gets the group parameters for a voting group.
     * @param groupKey The unique identifier for the voting group.
     * @return params The group parameters including member count and quorum settings.
     */
    function getGroupParams(bytes32 groupKey) external view returns (VoteTypes.GroupParams memory params);

    /**
     * @notice Gets the proposal result for a given context key.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     * @return result The proposal result including the vote tally and proposal passed status.
     */
    function getProposalResult(bytes32 contextKey) external view returns (VoteTypes.ProposalResult memory result);

    /**
     * @notice Gets the quorum parameters for the voting system.
     * @return params The quorum parameters including minimum and maximum quorum percentages and group size thresholds.
     */
    function getQuorumParams() external view returns (VoteTypes.QuorumParams memory params);

    /**
     * @notice Retrieves the current version of the VoteManager contract.
     * @return The version string of the VoteManager contract.
     */
    function getContractVersion() external view returns (string memory);

}