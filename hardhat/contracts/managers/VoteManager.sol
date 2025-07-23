// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

// Interfaces:
import { IVoteVerifier } from "../interfaces/IVoteVerifier.sol";
import { IVoteManager } from "../interfaces/IVoteManager.sol";

// Complex Types:
import { VoteTypes } from "../types/VoteTypes.sol";

contract VoteManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, IVoteManager, ERC165Upgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
    
    // ====================================================================================================
    // MERKLE ROOT ERRORS
    // ====================================================================================================

    /// @notice Thrown if the provided Merkle root does not match the expected root.
    error InvalidMerkleRoot();

    /// @notice Thrown if a Merkle root has not been initialized for a group.
    error RootNotYetInitialized();

    // ====================================================================================================
    // PROOF ERRORS
    // ====================================================================================================
    
    /// @notice Thrown if the context hash does not match the expected value.
    error InvalidContextHash();

    /// @notice Thrown if the vote nullifier has already been used.
    error VoteNullifierAlreadyUsed();
    
    /// @notice Thrown if the provided proof is invalid.
    /// @param contextKey The context key associated with the vote.
    /// @param proofVoteNullifier The nullifier associated with the vote proof.
    error InvalidVoteProof(bytes32 contextKey, bytes32 proofVoteNullifier);

    /// @notice Thrown if the vote choice in the public outputs does not match one of the expected values.
    error InvalidVoteChoice();

    // ====================================================================================================
    // GROUP PARAM ERRORS (memberCount, Quorum)
    // ====================================================================================================
    
    /// @notice Thrown if the quorum parameters are invalid.
    error InvalidQuorumParams();

    /// @notice Thrown if the group size values corresponding to the quorum thresholds are invalid.
    error InvalidGroupSizeParams();

    /// @notice Thrown if the member count is zero or greater than 1024.
    error InvalidMemberCount();

    /// @notice Thrown if the quorum is less than 25.
    error QuorumCannotBeLowerThan25();

    /// @notice Thrown if the group parameters (member count or quorum) are zero.
    error GroupParamsCannotBeZero();

    /// @notice Thrown if the x1 and x2 inputs for linear interpolation are invalid.
    error InvalidX1X2Inputs();

    /// @notice Thrown if the y1 and y2 inputs for linear interpolation are invalid.
    error InvalidY1Y2Inputs();

    /// @notice Thrown if the x input for linear interpolation is invalid.
    error InvalidXInput();

    // ====================================================================================================
    // GENERAL ERRORS
    // ====================================================================================================

    /// @notice Thrown if the provided address is not a contract.
    error AddressIsNotAContract();

    /// @notice Thrown if the provided address does not support the IVoteVerifier interface.
    error AddressDoesNotSupportInterface();

    /// @notice Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if the provided key is zero.
    error KeyCannotBeZero();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

    /**
     * @notice Emitted when a vote verifier address is set.
     * @param voteVerifier The address of the vote verifier contract.
     */
    event VoteVerifierAddressSet(address indexed voteVerifier);

    /**
     * @notice Emitted when a vote is verified.
     * @param contextKey The context key associated with the vote.
     * @param voteNullifier The nullifier associated with the vote proof.
     * @param voteContentHash The content hash of the vote.
     */
    event VoteVerified(bytes32 indexed contextKey, bytes32 indexed voteNullifier, bytes32 voteContentHash);

    /**
     * @notice Emitted when a quorum is set for a group.
     * @param groupKey The unique identifier for the group.
     * @param quorum The quorum percentage set for the group.
     */
    event QuorumSet(bytes32 indexed groupKey, uint256 indexed quorum);

    /**
     * @notice Emitted when quorum parameters are set.
     * @param minQuorumPercent The minimum quorum threshold percentage.
     * @param maxQuorumPercent The maximum quorum threshold percentage.
     * @param maxGroupSizeForMinQuorum The group size corresponding to the minimum quorum.
     * @param minGroupSizeForMaxQuorum The group size corresponding to the maximum quorum.
     */
    event QuorumParamsSet(
        uint256 minQuorumPercent,
        uint256 maxQuorumPercent,
        uint256 maxGroupSizeForMinQuorum,
        uint256 minGroupSizeForMaxQuorum
    );

    /**
     * @notice Emitted when a member count is set for a group.
     * @param groupKey The unique identifier for the group.
     * @param memberCount The number of members in the group.
     */
    event MemberCountSet(bytes32 indexed groupKey, uint256 memberCount);

    /**
     * @notice Emitted when a vote tally is updated.
     * @param contextKey The context key associated with the vote.
     * @param abstain The number of abstain votes.
     * @param yes The number of yes votes.
     * @param no The number of no votes.
     */
    event VoteTallyUpdated(bytes32 contextKey, uint256 abstain, uint256 yes, uint256 no);

    /**
     * @notice Emitted when a proposal's status is updated.
     * @param contextKey The context key associated with the proposal.
     * @param passed Indicates whether the proposal has passed (true) or not (false).
     */
    event ProposalStatusUpdated(bytes32 contextKey, bool passed);

// ====================================================================================================================
//                                          STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================

    // ====================================================================================================
    // STRUCTS & ENUMS
    // ====================================================================================================
    
    // Defined in VoteTypes.sol:
    // VoteTally, GroupParams, ProposalResult, QuorumParams, VoteChoice
    
    // ====================================================================================================
    // MAPPINGS
    // ====================================================================================================

    /// @dev The mapping of context keys to proposal results (vote tally and passed status). Key: contextKey (bytes32) => ProposalResult 
    mapping(bytes32 => VoteTypes.ProposalResult) private proposalResults; 

    /// @dev The mapping of vote nullifiers. Key: voteNullifier (bytes32) => (bool) true if the vote nullifier has been used
    mapping(bytes32 => bool) private voteNullifiers;  

    /// @dev The mapping of group governance parameters. Key: groupKey (bytes32) => GroupParams
    mapping(bytes32 => VoteTypes.GroupParams) private groupParams; // groupKey => GroupParams

    // ====================================================================================================
    // ADDRESSES
    // ====================================================================================================

    /// @dev The interface of the vote verifier contract.
    IVoteVerifier private voteVerifier;

    // ====================================================================================================
    // QUORUM STATE VARIABLES
    // ====================================================================================================

    /// @dev The quorum parameters, which include the minimum and maximum thresholds and group size parameters.
    /// These parameters are used to determine the quorum for proposals based on the group size.
    VoteTypes.QuorumParams private quorumParams = VoteTypes.QuorumParams({
        minQuorumPercent: 25,
        maxQuorumPercent: 50,
        maxGroupSizeForMinQuorum: 200,
        minGroupSizeForMaxQuorum: 30
    });

    // ====================================================================================================
    // CONSTANTS
    // ====================================================================================================

    /// @dev The values corresponding to the Poseidon hash of the Abstain (0), Yes (1) and No (2) votes.
    uint256 private constant POSEIDON_HASH_ABSTAIN = 19014214495641488759237505126948346942972912379615652741039992445865937985820;
    uint256 private constant POSEIDON_HASH_YES = 18586133768512220936620570745912940619677854269274689475585506675881198879027;
    uint256 private constant POSEIDON_HASH_NO = 8645981980787649023086883978738420856660271013038108762834452721572614684349;

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
    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     * @custom:error AddressDoesNotSupportInterface If the provided address does not support the `verifyProof` function.
     */
     function setVoteVerifier(address _voteVerifier) external onlyOwner nonZeroAddress(_voteVerifier) {
        if(_voteVerifier.code.length == 0) revert AddressIsNotAContract();
        if(!_supportsIVoteInterface(_voteVerifier)) revert AddressDoesNotSupportInterface();

        voteVerifier = IVoteVerifier(_voteVerifier);
        emit VoteVerifierAddressSet(_voteVerifier);
    }

    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error InvalidMerkleRoot If the provided Merkle root does not match the current root.
     * @custom:error InvalidContextHash If the provided context key does not match the proof context hash.
     * @custom:error VoteNullifierAlreadyUsed If the vote nullifier has already been used.
     * @custom:error RootNotYetInitialized If the current root has not been initialized.
     * @custom:error InvalidVoteProof If the provided proof is invalid.
     * @custom:error KeyCannotBeZero If the context or group key are zero.
     */
    function verifyVote(
        uint256[24] calldata proof,
        uint256[5] calldata publicSignals,
        bytes32 contextKey,
        bytes32 groupKey,
        bytes32 currentRoot
    ) 
        external 
        onlyOwner
        nonZeroKey(contextKey) 
        nonZeroKey(groupKey)
    {
        // save values from public signals:
        bytes32 proofContextHash = bytes32(publicSignals[0]);
        bytes32 proofVoteNullifier = bytes32(publicSignals[1]);
        uint256 proofVoteChoiceHash = publicSignals[2];
        bytes32 proofRoot = bytes32(publicSignals[3]);
        bytes32 proofVoteContentHash = bytes32(publicSignals[4]);

        // check root
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (proofRoot != currentRoot) revert InvalidMerkleRoot();

        // check that vote nullifier has not been used
        if (voteNullifiers[contextKey]) revert VoteNullifierAlreadyUsed();

        // check that context is correct
        if (contextKey != proofContextHash) revert InvalidContextHash();

        // verify that the proof is valid
        bool isValidVote = voteVerifier.verifyProof(proof, publicSignals);
        if (!isValidVote) revert InvalidVoteProof(contextKey, proofVoteNullifier);

        // mark the vote nullifier as used
        voteNullifiers[proofVoteNullifier] = true;

        // Emit event for verified vote
        emit VoteVerified(contextKey, proofVoteNullifier, proofVoteContentHash);

        // Infer the vote choice from the public outputs
        VoteTypes.VoteChoice inferredChoice;

        if (proofVoteChoiceHash == POSEIDON_HASH_ABSTAIN){
            inferredChoice = VoteTypes.VoteChoice.Abstain;
        } else if (proofVoteChoiceHash == POSEIDON_HASH_YES) {
            inferredChoice = VoteTypes.VoteChoice.Yes;
        } else if (proofVoteChoiceHash == POSEIDON_HASH_NO) {
            inferredChoice = VoteTypes.VoteChoice.No;
        } else {
            revert InvalidVoteChoice();
        }

        // Update vote tally for proposal
        VoteTypes.VoteTally storage tally = proposalResults[contextKey].tally;

        if ( inferredChoice == VoteTypes.VoteChoice.Abstain) {
            tally.abstain++;
        } else if ( inferredChoice == VoteTypes.VoteChoice.Yes) {
            tally.yes++;
        } else if ( inferredChoice == VoteTypes.VoteChoice.No) {
            tally.no++;
        }
        emit VoteTallyUpdated(contextKey, tally.abstain, tally.yes, tally.no);
        
        // Update the proposal's Passed status
        _updateProposalStatus(contextKey, groupKey);
    }

    
    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error KeyCannotBeZero If the group key is zero.
     * @custom:error InvalidMemberCount If the member count is zero or greater than 1024.
     */
    function setMemberCount(bytes32 groupKey, uint256 _memberCount) external onlyOwner nonZeroKey(groupKey) {
        if (_memberCount == 0 || _memberCount > 1024) revert InvalidMemberCount();

        groupParams[groupKey].memberCount = _memberCount;
        emit MemberCountSet(groupKey, _memberCount);

        if (_memberCount <= quorumParams.minGroupSizeForMaxQuorum ) {
            _setQuorum(groupKey, quorumParams.maxQuorumPercent);
        } else if (_memberCount > quorumParams.maxGroupSizeForMinQuorum) {
            _setQuorum(groupKey, quorumParams.minQuorumPercent);
        } else {
            uint256 interpolatedQuorum = _linearInterpolation(
                _memberCount, 
                quorumParams.minGroupSizeForMaxQuorum, 
                quorumParams.maxQuorumPercent,
                quorumParams.maxGroupSizeForMinQuorum,
                quorumParams.minQuorumPercent
            );

            _setQuorum(groupKey, interpolatedQuorum);
        }
    }

    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error InvalidQuorumParams If the quorum parameters are invalid.
     * @custom:error InvalidGroupSizeParams If the group size values corresponding to the quorum thresholds are invalid.
     */
    function setQuorumParams(
        uint256 _minQuorumPercent,
        uint256 _maxQuorumPercent,
        uint256 _maxGroupSizeForMinQuorum,
        uint256 _minGroupSizeForMaxQuorum
    ) external onlyOwner {
        if (_minQuorumPercent < 25 ||
            _minQuorumPercent > _maxQuorumPercent ||
            _maxQuorumPercent > 50 ) revert InvalidQuorumParams();

        if (_maxGroupSizeForMinQuorum < _minGroupSizeForMaxQuorum ||
            _maxGroupSizeForMinQuorum > 1024 ||
            _minGroupSizeForMaxQuorum < 5) revert InvalidGroupSizeParams();

        if (quorumParams.minQuorumPercent != _minQuorumPercent) {
            quorumParams.minQuorumPercent = _minQuorumPercent;
        }

        if (quorumParams.maxQuorumPercent != _maxQuorumPercent) {
            quorumParams.maxQuorumPercent = _maxQuorumPercent;
        }
        
        if (quorumParams.maxGroupSizeForMinQuorum != _maxGroupSizeForMinQuorum) {
            quorumParams.maxGroupSizeForMinQuorum = _maxGroupSizeForMinQuorum;
        }

        if (quorumParams.minGroupSizeForMaxQuorum != _minGroupSizeForMaxQuorum) {
            quorumParams.minGroupSizeForMaxQuorum = _minGroupSizeForMaxQuorum;
        }

        emit QuorumParamsSet(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        );

    }

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Only callable by the owner (governor).
     */
    function getVoteVerifier() external view onlyOwner returns (address) {
        return address(voteVerifier);
    }

    /**
     * @dev Only callable by the owner (governor).
     */
    function getVoteNullifierStatus(bytes32 nullifier) external view onlyOwner returns (bool) {
        return voteNullifiers[nullifier];
    }

    /**
     * @dev Only callable by the owner (governor).
     */
    function getGroupParams(bytes32 groupKey) external view onlyOwner returns (VoteTypes.GroupParams memory params) {
        return groupParams[groupKey];
    }

    /**
     * @dev Only callable by the owner (governor).
     */
    function getProposalResult(bytes32 contextKey) external view onlyOwner returns (VoteTypes.ProposalResult memory result) {
        return proposalResults[contextKey];
    }

    /**
     * @dev Only callable by the owner (governor).
     */
    function getQuorumParams() external view onlyOwner returns (VoteTypes.QuorumParams memory params) {
        return quorumParams;
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================
    
    /**
     * @dev Computes and updates the proposal's passed status based on the group parameters and proposal results.
     * @param contextKey The unique identifier for the proposal context.
     * @param groupKey The unique identifier for the group.
     * @custom:error KeyCannotBeZero If the context or group key are zero.
     * @custom:error GroupParamsCannotBeZero If the member count or quorum is zero.
     */
    function _updateProposalStatus(bytes32 contextKey, bytes32 groupKey) private nonZeroKey(contextKey) nonZeroKey(groupKey) {
        VoteTypes.GroupParams storage params = groupParams[groupKey];
        VoteTypes.ProposalResult storage proposal = proposalResults[contextKey];

        if (params.memberCount == 0 || params.quorum == 0) revert GroupParamsCannotBeZero(); 
        bool hasPassed = _computePassedStatus(params, proposal);

        // update passed value if it is different from the current value
        if (hasPassed != proposal.passed) {
            proposal.passed = hasPassed;
        }

        emit ProposalStatusUpdated(contextKey, hasPassed);
    }

    /**
     * @dev Sets the quorum for a group.
     * @param groupKey The unique identifier for the group.
     * @param _quorum The quorum percentage to set for the group.
     * @custom:error QuorumCannotBeLowerThan25 If the quorum is less than 25.
     * @custom:error KeyCannotBeZero If the group key is zero.
     */
    function _setQuorum(bytes32 groupKey, uint256 _quorum) private nonZeroKey(groupKey) {
        if (_quorum < 25 ) revert QuorumCannotBeLowerThan25();
        groupParams[groupKey].quorum = _quorum;
        emit QuorumSet(groupKey, _quorum);
    }
    
    /**
     * @dev Computes whether a proposal has passed based on the group parameters and proposal results.
     * @param params The group parameters containing member count and quorum.
     * @param proposal The proposal result containing the vote tally.
     * @return bool True if the proposal has passed, false otherwise.
     */
    function _computePassedStatus(VoteTypes.GroupParams memory params, VoteTypes.ProposalResult memory proposal) private pure returns (bool)  {    
        uint256 totalVotes = proposal.tally.abstain + proposal.tally.yes + proposal.tally.no;
        uint256 requiredVotes = _ceilDiv(params.memberCount * params.quorum, 100);
        
        bool hasReachedQuorum = totalVotes >= requiredVotes;
        bool hasYesMajority = proposal.tally.yes > proposal.tally.no;
        // bool hasMinimumMembers = params.memberCount >= 5;

        return hasReachedQuorum && hasYesMajority;
    }

    /**
     * @dev Performs linear interpolation to find the y value for a given x.
     * @param x The x value for which to find the corresponding y value.
     * @param x1 The first x value in the range.
     * @param y1 The corresponding y value for x1.
     * @param x2 The second x value in the range.
     * @param y2 The corresponding y value for x2.
     * @return uint256 The interpolated y value for the given x.
     * @custom:error InvalidX1X2Inputs If x2 is less than or equal to x1.
     * @custom:error InvalidY1Y2Inputs If y2 is less than or equal to y1.
     * @custom:error InvalidXInput If x is less than or equal to x1 or greater than x2.
     * @notice This function assumes that x1 < x2 and y1 < y2.
     * It uses the formula: y = y1 + slope * (x - x1), where slope = (y2 - y1) / (x2 - x1).
     */
    function _linearInterpolation(
        uint256 x,
        uint256 x1,
        uint256 y1,
        uint256 x2,
        uint256 y2
    ) private pure returns (uint256) {
        // y = y1 + slope * (x  - x1)
        // slope = (y2 - y1) / (x2 - x1)
        if (x2 <= x1) revert InvalidX1X2Inputs();
        if (y2 <= y1) revert InvalidY1Y2Inputs();
        if (x <= x1 || x > x2) revert InvalidXInput();

        uint256 slope = (y2 - y1 ) / (x2 - x1);
        return y1 + slope * (x - x1);
    }

    /**
     * @dev Computes the ceiling division of two numbers.
     * @param a The numerator.
     * @param b The denominator.
     * @return uint256 The result of the ceiling division.
     */
    function _ceilDiv(uint256 a, uint256 b) private pure returns (uint256) {
        return (a + b - 1) / b;
    }

    /**
     * @dev Checks if the provided address supports the `verifyProof` function for proposal submissions.
     * @param _address The address to check.
     * @return bool True if the address supports the IProposalVerifier interface, false otherwise.
     */
    function _supportsIVoteInterface(address _address) private view returns (bool) {
        uint256[24] memory dummyProof = [uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
        uint256[5] memory dummyPublicSignals = [uint256(1), 2, 3, 4, 5];

        try IVoteVerifier(_address).verifyProof(dummyProof, dummyPublicSignals) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }

}
