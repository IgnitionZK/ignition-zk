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
contract ProposalManagerV2 is Initializable, OwnableUpgradeable, UUPSUpgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
     // Merkle Root errors:
    error InvalidMerkleRoot();
    error RootNotYetInitialized();

    // Proof errors:
    error InvalidProof(bytes32 contextKey, bytes32 nullifier);
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
     * @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
     * @param nullifier The nullifier associated with the proof.
     * @param contentHash The hash of the proposal content.
     */
    event ProofVerified(bytes32 indexed contextKey, bytes32 indexed nullifier, bytes32 indexed contentHash);
    /**
     * @notice Emitted when the verifier address is set.
     * @param verifierAddress The address of the new verifier contract.
     */
    event VerifierAddressSet(address indexed verifierAddress);

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
        address _governor
    ) external initializer {
        // this makes the MembershipManager owner == governor so that only the governor can update the MembershipManager logic
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();
        if (_verifier == address(0)) revert VerifierAddressCannotBeZero();
        if (_governor == address(0)) revert GovernorAddressCannotBeZero();

        verifier = IProposalVerifier(_verifier);
        emit VerifierAddressSet(_verifier);
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
    function setProposalVerifier(address _verifier) external onlyOwner nonZeroAddress(_verifier) {
        verifier = IProposalVerifier(_verifier);
        emit VerifierAddressSet(_verifier);
    }

    /**
     * @notice Verifies a zk-SNARK proof for a proposal submission.
     * @dev This function can only be called by the contract owner (governor).
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     * @custom:error InvalidProof If the proof is invalid.
     */
    function verifyProposal(
        uint256[24] calldata proof,
        uint256[4] calldata publicSignals,
        bytes32 contextKey,
        bytes32 currentRoot
    ) external onlyOwner nonZeroKey(contextKey) {

        bytes32 proofContextHash = bytes32(publicSignals[0]);
        bytes32 nullifier = bytes32(publicSignals[1]);
        bytes32 proofRoot = bytes32(publicSignals[2]);
        bytes32 proofContentHash = bytes32(publicSignals[3]);

        // check proofRoot matches currentRoot from MembershipManager
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (proofRoot != currentRoot) revert InvalidMerkleRoot();

        // Check if the proposal is already submitted
        if (proposalNullifiers[nullifier]) revert NullifierAlreadyUsed();

        // check proposalContextHash matches the one in the public signals
        if (proofContextHash != contextKey) revert InvalidContextHash();
        
        // Verify the proof using the verifier contract
        bool isValid = verifier.verifyProof(proof, publicSignals);
        if (!isValid) {
            revert InvalidProof(contextKey, nullifier);
        }
        // If all checks pass, mark the nullifier as used and store the proposal submission
        proposalNullifiers[nullifier] = true;
        proposalSubmissions[contextKey] = proofContentHash;

        emit ProofVerified(contextKey, nullifier, proofContentHash);
    }
// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Returns the address of the proposal verifier contract.
     * @dev Only callable by the owner (governor).
     * @return address of the proposal verifier contract.
     */
    function getProposalVerifier() external view onlyOwner returns (address) {
        return address(verifier);
    }

    /**
     * @notice Returns the nullifier status for a given nullifier.
     * @param nullifier The nullifier to check.
     * @return bool indicating whether the nullifier has been used.
     */
    function getProposalNullifierStatus(bytes32 nullifier) external view onlyOwner returns (bool) {
        return proposalNullifiers[nullifier];
    }




}