// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// interfaces imports:
import {IProposalVerifier} from "../interfaces/IProposalVerifier.sol";
import {IMembershipManager} from "../interfaces/IMembershipManager.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// tracks proposal submissions and verifications (pre-vote phase)
contract ProposalManager is Initializable, OwnableUpgradeable, UUPSUpgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
     // Merkle Root errors:
    error InvalidMerkleRoot();
    error RootNotYetInitialized();

    // Proof errors:
    error InvalidProof(bytes32 groupKey, bytes32 epochKey, bytes32 nullifier);
    error NullifierAlreadyUsed();
    error InvalidContextHash();
    error InvalidContentHash();
    // General errors:
    error VerifierAddressCannotBeZero();
    error GovernorAddressCannotBeZero();
    error AddressCannotBeZero();

    error KeyCannotBeZero();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================
    /**
     * @notice Emitted when a proof is successfully verified.
     * @param groupKey The unique identifier for the group.
     * @param epochKey The unique identifier for the epoch.
     * @param nullifier The nullifier associated with the proof.
     */
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed epochKey, bytes32 indexed nullifier);
    /**
     * @notice Emitted when a proposal is submitted.
     * @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
     * @param contentHash The hash of the proposal content.
     */
    event ProposalSubmitted(bytes32 indexed contextKey, bytes32 indexed contentHash);
    /**
     * @notice Emitted when the verifier address is set.
     * @param verifierAddress The address of the new verifier contract.
     */
    event VerifierAddressSet(address indexed verifierAddress);
    /**
     * @notice Emitted when the membership manager address is set.
     * @param membershipManagerAddress The address of the new membership manager contract.
     */
    event MembershipManagerAddressSet(address indexed membershipManagerAddress);


// ====================================================================================================================
//                                          STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================

    // Mappings:
    mapping(bytes32 => bool) private proposalNullifiers; // proposalNullifier => true if the proposal is already submitted / active
    mapping(bytes32 => bytes32) private proposalSubmissions; // contextKey => contentHash

    // is a struct necessayry here?
    // If we want to store more information about the proposal submission, we can use a struct
    // For now, we only store the content hash of the proposal submission.
    /* 
    struct ProposalSubmissions {
        bytes32 contentHash; // hash of the proposal content
        bool isDeleted; // true if the proposal is deleted
    }

    mapping(bytes32 => ProposalSubmissions) private proposalSubmissionsMap; // contextKey => ProposalSubmissions
    */

    IProposalVerifier private verifier;
    IMembershipManager private membershipManager;
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
     * @notice Initializes the MembershipManager contract.
     * @dev This function replaces the constructor for upgradeable contracts and is called once
     * after the proxy is deployed. It sets the initial verifier and governor.
     * @param _verifier The address of the zk-SNARK verifier contract.
     * @param _governor The address of the governor (DAO) contract.
     * @custom:error VerifierAddressCannotBeZero If the provided verifier address is zero.
     * @custom:error GovernorAddressCannotBeZero If the provided governor address is zero.
     */
    function initialize(
        address _verifier, 
        address _governor,
        address _membershipManager
    ) external initializer {
        // this makes the MembershipManager owner == governor so that only the governor can update the MembershipManager logic
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();
        if (_verifier == address(0)) revert VerifierAddressCannotBeZero();
        if (_governor == address(0)) revert GovernorAddressCannotBeZero();

        verifier = IProposalVerifier(_verifier);
        membershipManager = IMembershipManager(_membershipManager);

        emit VerifierAddressSet(_verifier);
        emit MembershipManagerAddressSet(_membershipManager);
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Sets the address of the proposal verifier contract.
     * @dev This function can only be called by the contract owner (governor).
     * @param _verifier The address of the new proposal verifier contract.
     * @custom:error VerifierAddressCannotBeZero If the provided verifier address is zero.
     */
    function setVerifier(address _verifier) external onlyOwner nonZeroAddress(_verifier) {
        verifier = IProposalVerifier(_verifier);
        emit VerifierAddressSet(_verifier);
    }

    /**
     * @notice Verifies a zk-SNARK proof for a proposal submission.
     * @dev This function can only be called by the contract owner (governor).
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param groupKey The unique identifier for the group.
     * @param epochKey The unique identifier for the epoch.
     * @custom:error InvalidProof If the proof is invalid.
     */
    function verifyProof(
        uint256[24] calldata proof,
        uint256[4] calldata publicSignals,
        bytes32 groupKey, 
        bytes32 epochKey
    ) external onlyOwner nonZeroKey(groupKey) nonZeroKey(epochKey) {

        bytes32 proofContentHash = bytes32(publicSignals[0]);
        bytes32 nullifier = bytes32(publicSignals[1]);
        bytes32 proofRoot = bytes32(publicSignals[2]);
        bytes32 proofContextHash = bytes32(publicSignals[3]);

        bytes32 contextKey = _contextKey(groupKey, epochKey);
        bytes32 currentRoot = membershipManager.getRoot(groupKey);

        // check proofRoot matches currentRoot from MembershipManager
        if (proofRoot != currentRoot) revert InvalidMerkleRoot();
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();

        // Check if the proposal is already submitted
        if (proposalNullifiers[nullifier]) revert NullifierAlreadyUsed();

        // check proposalContextHash matches the one in the public signals
        if (proofContextHash != contextKey) revert InvalidContextHash();
        
        // Verify the proof using the verifier contract
        bool isValid = verifier.verifyProof(proof, publicSignals);
        if (!isValid) {
            revert InvalidProof(groupKey, epochKey, nullifier);
        }
        // If all checks pass, mark the nullifier as used and store the proposal submission
        proposalNullifiers[nullifier] = true;
        proposalSubmissions[contextKey] = proofContentHash;

        emit ProofVerified(groupKey, epochKey, nullifier);
        emit ProposalSubmitted(contextKey, proofContentHash);
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================
    /**
     * @notice Generates a unique context key based on the group key and epoch key.
     * @param groupKey The unique identifier for the group.
     * @param epochKey The unique identifier for the epoch.
     * @return bytes32 The generated context key.
     */
    function _contextKey(bytes32 groupKey, bytes32 epochKey) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(groupKey, epochKey));
    }


}