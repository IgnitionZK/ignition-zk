// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// interfaces imports:
import {IProposalManager} from "../interfaces/IProposalManager.sol";
import {IProposalVerifier} from "../interfaces/IProposalVerifier.sol";
import {IMembershipManager} from "../interfaces/IMembershipManager.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// tracks proposal submissions and verifications (pre-vote phase)
contract ProposalManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, IProposalManager {

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
    
    /// @notice Thrown if the zk-SNARK proof is invalid.
    /// @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
    /// @param nullifier The nullifier associated with the proof.
    error InvalidProof(bytes32 contextKey, bytes32 nullifier);
    
    /// @notice Thrown if the nullifier has already been used.
    error NullifierAlreadyUsed();
    
    /// @notice Thrown if the context hash does not match the expected value.
    error InvalidContextHash();

    /// @notice Thrown if the content hash of the proposal does not match the expected value.
    error InvalidContentHash();
    
    // ====================================================================================================
    // GENERAL ERRORS
    // ====================================================================================================

    /// @notice Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if the provided key (groupKey or contextKey) is zero.
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

    /// @dev Maps proposal nullifiers to their status (true if the proposal is already submitted / active).
    mapping(bytes32 => bool) private proposalNullifiers; // proposalNullifier => true if the proposal is already submitted / active
    
    /// @dev Maps context keys (groupKey + epochKey) to proposal content hashes.
    mapping(bytes32 => bytes32) private proposalSubmissions; // contextKey => contentHash

    // Addresses:
    /// @dev The address of the proposal verifier contract.
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
     * @custom:error AddressCannotBeZero If the provided verifier or governor address is zero.
     */
    function initialize(
        address _verifier, 
        address _governor
    ) 
        external 
        initializer 
        nonZeroAddress(_verifier) 
        nonZeroAddress(_governor) 
    {
        // this makes the MembershipManager owner == governor so that only the governor can update the MembershipManager logic
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();

        verifier = IProposalVerifier(_verifier);
        emit VerifierAddressSet(_verifier);
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    
    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     */
    function setProposalVerifier(address _verifier) external onlyOwner nonZeroAddress(_verifier) {
        verifier = IProposalVerifier(_verifier);
        emit VerifierAddressSet(_verifier);
    }

    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error InvalidProof If the proof is invalid.
     * @custom:error NullifierAlreadyUsed If the nullifier has already been used.
     * @custom:error InvalidContextHash If the context hash does not match the expected value.
     * @custom:error InvalidMerkleRoot If the provided Merkle root does not match the expected root.
     * @custom:error RootNotYetInitialized If the Merkle root has not been initialized for the group.
     * @custom:error KeyCannotBeZero If the provided context key is zero.
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
     * @dev Only callable by the owner (governor).
     */
    function getProposalVerifier() external view onlyOwner returns (address) {
        return address(verifier);
    }

    /**
     * @dev Only callable by the owner (governor).
     */
    function getProposalNullifierStatus(bytes32 nullifier) external view onlyOwner returns (bool) {
        return proposalNullifiers[nullifier];
    }

    /**
     * @dev Only callable by the owner (governor).
     */
    function getProposalSubmission(bytes32 contextKey) external view onlyOwner returns (bytes32) {
        return proposalSubmissions[contextKey];
    }



}