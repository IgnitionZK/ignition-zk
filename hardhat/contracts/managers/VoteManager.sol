// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

import { IVoteVerifier } from "../interfaces/IVoteVerifier.sol";


contract VoteManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, IVoteManager, ERC165Upgradeable {

    error InvalidMerkleRoot();
    error InvalidContextHash();
    error VoteNullifierAlreadyUsed();
    error RootNotYetInitialized();
    error InvalidVoteProof(bytes32 contextKey, bytes32 proofVoteNullifier);
    error MembersCountCannotBeZero();
    error QuorumCannotBeLowerThan25();

    event VoteVerifierAddressSet(address indexed voteVerifier);
    event VoteVerified(bytes32 indexed contextKey, indexed proofVoteNullifier, proofVoteContentHash);
    event QuorumSet(bytes32 indexed groupKey, uint256 indexed quorum);
    event MembersCountSet(bytes32 indexed groupKey, uint256 indexed membersCount);

    enum VoteChoice { Abstain, Yes, No }

    struct VoteTally {
        uint256 abstain;
        uint256 yes;
        uint256 no;
    }

    struct ProposalStatus {
        VoteTally tally;
        bool passed;
    }

    mapping(bytes32 => ProposalStatus) private proposalStatuses; // voteContextHash (group, epoch, proposal) => VoteTally
    mapping(bytes32 => bool) private voteNullifiers; // status of vote nullifier => used (true, false) 

    struct GroupGovernance {
        uint256 memberCount;
        uint256 quorum;
    }

    mapping(bytes32 => GroupGovernance) private groupGovernance; // groupKey => GroupGovernance

    IVoteVerifier private voteVerifier;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Ensures that the provided group key is not zero.
     * @param key The unique identifier for the group.
     */
    modifier nonZeroKey(bytes32 key) {
        if (key == bytes32(0)) revert KeyCannotBeZero();
        _;
    }

    /**
     * @dev Ensures that the provided address is not the zero address.
     * @param addr The address to check.
     */
    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) revert AddressCannotBeZero();
        _;
    }

// ====================================================================================================================
//                                 CONSTRUCTOR / INITIALIZER / UPGRADE AUTHORIZATION
// ====================================================================================================================

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's governor.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); 
    }

    /**
     * @notice Initializes the VoteManager contract.
     * @dev This function replaces the constructor for upgradeable contracts and is called once
     * after the proxy is deployed. It sets the initial verifier and governor.
     * @param _governor The address of the governor (DAO) contract.
     * @param _voteVerifier The address of the vote verifier contract. 
     * @custom:error AddressCannotBeZero If the provided verifier or governor address is zero.
     */
    function initialize(
        address _governor,
        address _voteVerifier
    ) 
        external 
        initializer 
        nonZeroAddress(_governor) 
        nonZeroAddress(_voteVerifier)
    {
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();
        __ERC165_init();

        voteVerifier = IVoteVerifier(_voteVerifier);
        emit VoteVerifierAddressSet(_voteVerifier);
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    function verifyVote(
        uint256[24] calldata proof,
        uint256[4] calldata publicSignals,
        bytes32 contextKey,
        bytes32 groupKey,
        bytes32 currentRoot,
        VoteChoice choice
    ) 
        external 
        onlyOwner
        nonZeroKey(contextKey) 
    {
        // save values from public signals:
        bytes32 proofContextHash = bytes32(publicSignals[0]);
        bytes32 proofVoteNullifier = bytes32(publicSignals[1]);
        bytes32 proofRoot = bytes32(publicSignals[2]);
        bytes32 proofVoteContentHash = bytes32(publicSignals[3]);
        
        // check root
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (proofRoot != currentRoot) revert InvalidMerkeRoot();

        // check that vote nullifier has not been used
        if (voteNullifiers[contextKey]) revert VoteNullifierAlreadyUsed();

        // check that context is correct
        if (contextKey != proofContextHash) revert InvalidContextHash();

        // verify that the proof is valid
        bool isValidVote = voteVerifier.verifyProof(proof, publicSignals);
        if (!isValidVote) revert InvalidVoteProof(contextKey, proofVoteNullifier);

        // mark the vote nullifier as used
        voteNullifiers[proofVoteNullifier] = true;

        // Update vote tally for proposal
        VoteTally storage tally = proposalStatuses[contextKey].tally;

        if ( choice == VoteChoice.Abstain) {
            tally.abstain++;
        } else if ( choice == VoteChoice.Yes) {
            tally.yes++;
        } else if ( choice == VoteChoice.No) {
            tally.no++;
        }
        emit VoteVerified(contextKey, proofVoteNullifier, proofVoteContentHash);

        // Update the proposal's Passed status
        updateProposalStatus(contextKey, groupKey);
    }

    function updateProposalStatus(
        bytes32 contextKey, 
        bytes32 groupKey
    ) external onlyOwner nonZeroKey(contextKey) nonZeroKey(groupKey) {
        GroupGovernance storage groupParams = groupGovernance[groupKey];
        ProposalStatus storage status = proposalStatuses[contextKey];

        uint256 totalVotes = status.tally.abstain + status.tally.yes + status.tally.no;
        uint256 requiredVotes = _ceilDiv(groupParams.memberCount * groupParams.quorum, 100);
        bool hasReachedQuorum = totalVotes >= requiredVotes;
        bool hasYesMajority = status.tally.yes > status.tally.no;
        bool hasPassed = hasReachedQuorum && hasYesMajority;

        // update passed value
        status.passed = hasPassed;
    }

    function setMembersCount(bytes32 groupKey, uint256 _membersCount) external onlyOwner nonZeroKey(groupKey) {
        if (_membersCount == 0) revert MembersCountCannotBeZero();

        groupGovernance[groupKey].membersCount = _membersCount;
        emit MembersCountSet(groupKey, _membersCount);
    }

    function setQuorum(bytes32 groupKey, uint256 _quorum) external onlyOwner nonZeroKey(groupKey) {
        if (_quorum < 25 ) revert QuorumCannotBeLowerThan25();

        groupGovernance[groupKey].quorum = _quorum;
        emit QuorumSet(groupKey, _quorum);
    }


// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    function _ceilDiv(uint256 a, uint256 b) private view returns (uint256) {
        return (a + b - 1) / b;
    }

    function _votesCast(bytes32 contextKey) private view returns (uint256 numTotalVotes, uint256 numYesVotes)  {
        VoteTally storage tally = voteTallies[contextKey];
        numTotalVotes = tally.abstain + tally.yes + tally.no;
        numYesVotes = tally.numYesVotes;
    }

    /**
     * @dev Checks if the provided address supports the `verifyProof` function for proposal submissions.
     * @param _address The address to check.
     * @return bool True if the address supports the IProposalVerifier interface, false otherwise.
     */
    function _supportsIVoteInterface(address _address) private view returns (bool) {
        uint256[24] memory dummyProof = [uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
        uint256[4] memory dummyPublicSignals = [uint256(1), 2, 3, 4];

        try IVoteVerifier(_address).verifyProof(dummyProof, dummyPublicSignals) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }


}
