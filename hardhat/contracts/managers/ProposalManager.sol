// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.28 <0.9.0;

// OZ imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// Interfaces
import { IProposalManager } from "../interfaces/managers/IProposalManager.sol";
import { IProposalVerifier } from "../interfaces/verifiers/IProposalVerifier.sol";
import { IProposalClaimVerifier } from "../interfaces/verifiers/IProposalClaimVerifier.sol";
import { IMembershipManager } from "../interfaces/managers/IMembershipManager.sol";
import { IVersioned } from "../interfaces/IVersioned.sol";

/**
 * @title ProposalManager
 * @notice This contract manages the proposal submission and verification process.
 * It ensures that proposals are submitted, verified, and claimed in a secure and efficient manner.
 */
contract ProposalManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable, IProposalManager, IVersioned {
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
    
    /// @notice Thrown if the zk-SNARK proposal submission proof is invalid.
    /// @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
    /// @param submissionNullifier The submission nullifier associated with the proof.
    error InvalidSubmissionProof(bytes32 contextKey, bytes32 submissionNullifier);

    /// @notice Thrown if the zk-SNARK proposal claim proof is invalid.
    /// @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
    /// @param claimNullifier The claim nullifier associated with the proof.
    /// @param submissionNullifier The submission nullifier associated with the proof.
    error InvalidClaimProof(bytes32 contextKey, bytes32 claimNullifier, bytes32 submissionNullifier);

    /// @notice Thrown if the submission nullifier has already been used.
    error SubmissionNullifierAlreadyUsed();

    /// @notice Thrown if the claim nullifier has already been used.
    error ClaimNullifierAlreadyUsed();

    /// @notice Thrown if the context hash does not match the expected value.
    error InvalidContextHash();

    /// @notice Thrown if the content hash of the proposal does not match the expected value.
    error InvalidContentHash();

    /// @notice Thrown if the proposal has not been submitted yet.
    error ProposalHasNotBeenSubmitted();

    // @notice Thrown if the proposal has already been claimed.
    error ProposalHasAlreadyBeenClaimed();
    
    // ====================================================================================================
    // GENERAL ERRORS
    // ====================================================================================================

    /// @notice Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if the provided address is not a contract.
    error AddressIsNotAContract();

    /// @notice Thrown if the provided address does not support the required interface.
    /// @dev This is used to check if the address supports the `verifyProof` function
    //error AddressDoesNotSupportInterface();

    /// @notice Thrown if the provided key (groupKey or contextKey) is zero.
    error KeyCannotBeZero();

    /// @notice Thrown if ETH is sent to this contract.
    error ETHTransfersNotAccepted();

    /// @notice Thrown when a function not defined in this contract is called.
    error UnknownFunctionCall();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================
    
    /**
     * @notice Emitted when a proof is successfully verified.
     * @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
     * @param submissionNullifier The submission nullifier associated with the proof.
     * @param contentHash The hash of the proposal content.
     */
    event SubmissionVerified(bytes32 indexed contextKey, bytes32 indexed submissionNullifier, bytes32 indexed claimNullifier, bytes32 contentHash);
    
    /**
     * @notice Emitted when a proposal claim is successfully verified.
     * @param contextKey The unique context key for the proposal, derived from groupKey and epochKey.
     * @param claimNullifier The claim nullifier associated with the proof.
     * @param submissionNullifier The submission nullifier associated with the proof.
     */
    event ClaimVerified(bytes32 indexed contextKey, bytes32 indexed claimNullifier, bytes32 indexed submissionNullifier);
    
    /**
     * @notice Emitted when the proposal submission verifier address is set.
     * @param _submissionVerifier The address of the new proposal submission verifier contract.
     */
    event SubmissionVerifierAddressSet(address indexed _submissionVerifier);

    /**
     * @notice Emitted when the claim verifier address is set.
     * @param _claimVerifier The address of the new claim verifier contract.
     */
    event ClaimVerifierAddressSet(address indexed _claimVerifier);

    /**
     * @notice Emitted when the membership manager address is set.
     * @param _membershipManager The address of the new membership manager contract.
     */
    event MembershipManagerAddressSet(address indexed _membershipManager);

// ====================================================================================================================
//                                          STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================
    
    /// @dev The mapping of proposal submissions nullifiers. Key: submissionNullifier => true if the submission nullifier has been used
    mapping(bytes32 => bool) public submissionNullifiers; 
    
    /// @dev The mapping of proposal claim nullifiers. Key: claimNullifier => true if the claim nullifier has been used
    mapping(bytes32 => bool) public claimNullifiers; 

    // Interfaces
    /// @dev The interface of the proposal submission verifier contract.
    IProposalVerifier public submissionVerifier;

    /// @dev The interface of the proposal claim verifier contract.
    IProposalClaimVerifier public claimVerifier;

    /// @dev The interface of the membership manager contract.
    IMembershipManager public membershipManager;

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
     * @notice Initializes the ProposalManager contract.
     * @dev This function replaces the constructor for upgradeable contracts and is called once
     * after the proxy is deployed. It sets the initial verifier and governor.
     * @param _governor The address of the governor (DAO) contract.
     * @param _submissionVerifier The address of the proposal submission verifier contract.
     * @param _claimVerifier The address of the proposal claim verifier contract.
     * @param _membershipManager The address of the membership manager contract.
     * @custom:error AddressCannotBeZero If the provided verifier or governor address is zero.
     */
    function initialize(
        address _governor,
        address _submissionVerifier, 
        address _claimVerifier,
        address _membershipManager
    ) 
        external 
        initializer 
        nonZeroAddress(_governor) 
        nonZeroAddress(_submissionVerifier) 
        nonZeroAddress(_claimVerifier)
        nonZeroAddress(_membershipManager)
    {
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        submissionVerifier = IProposalVerifier(_submissionVerifier);
        claimVerifier = IProposalClaimVerifier(_claimVerifier);
        membershipManager = IMembershipManager(_membershipManager);
        emit SubmissionVerifierAddressSet(_submissionVerifier);
        emit ClaimVerifierAddressSet(_claimVerifier);
        emit MembershipManagerAddressSet(_membershipManager);
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================
    
    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     */
    function setProposalSubmissionVerifier(address _submissionVerifier) external onlyOwner nonZeroAddress(_submissionVerifier) {
        if(_submissionVerifier.code.length == 0) revert AddressIsNotAContract();
        //if(!_supportsIProposalInterface(_submissionVerifier)) revert AddressDoesNotSupportInterface();

        submissionVerifier = IProposalVerifier(_submissionVerifier);
        emit SubmissionVerifierAddressSet(_submissionVerifier);
    }

    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     */
    function setProposalClaimVerifier(address _claimVerifier) external onlyOwner nonZeroAddress(_claimVerifier) {
        if(_claimVerifier.code.length == 0) revert AddressIsNotAContract();
        //if(!_supportsIProposalClaimInterface(_claimVerifier)) revert AddressDoesNotSupportInterface();

        claimVerifier = IProposalClaimVerifier(_claimVerifier);
        emit ClaimVerifierAddressSet(_claimVerifier);
    }

    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error InvalidProof If the proof is invalid.
     * @custom:error SubmissionNullifierAlreadyUsed If the nullifier has already been used.
     * @custom:error InvalidContextHash If the context hash does not match the expected value.
     * @custom:error InvalidMerkleRoot If the provided Merkle root does not match the expected root.
     * @custom:error RootNotYetInitialized If the Merkle root has not been initialized for the group.
     * @custom:error KeyCannotBeZero If the provided context key is zero.
     */
    function verifyProposal(
        uint256[24] calldata proof,
        uint256[5] calldata publicSignals,
        bytes32 contextKey,
        bytes32 groupKey
    ) 
        external 
        onlyOwner 
        nonReentrant
        nonZeroKey(contextKey) 
        nonZeroKey(groupKey)
    {

        bytes32 proofContextHash = bytes32(publicSignals[0]);
        bytes32 proofSubmissionNullifier = bytes32(publicSignals[1]);
        bytes32 proofClaimNullifier = bytes32(publicSignals[2]);
        bytes32 proofRoot = bytes32(publicSignals[3]);
        bytes32 proofContentHash = bytes32(publicSignals[4]);

        // Checks:
        // check proofRoot matches currentRoot from MembershipManager
        bytes32 currentRoot = membershipManager.groupRoots(groupKey);
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (proofRoot != currentRoot) revert InvalidMerkleRoot();

        // Check if the proposal is already submitted
        if (submissionNullifiers[proofSubmissionNullifier]) revert SubmissionNullifierAlreadyUsed();

        // check proposalContextHash matches the one in the public signals
        if (proofContextHash != contextKey) revert InvalidContextHash();

        // Effects:
        // Mark the nullifier as used before verification to prevent re-entrancy attacks
        submissionNullifiers[proofSubmissionNullifier] = true;
        emit SubmissionVerified(contextKey, proofSubmissionNullifier, proofClaimNullifier, proofContentHash);
        
        // Interactions:
        // Verify the proof using the verifier contract
        bool isValidSubmission = submissionVerifier.verifyProof(proof, publicSignals);
        if (!isValidSubmission) {
            revert InvalidSubmissionProof(contextKey, proofSubmissionNullifier);
        }
    }

    function verifyProposalClaim(
        uint256[24] calldata proof,
        uint256[3] calldata publicSignals,
        bytes32 contextKey
    ) 
        external 
        onlyOwner 
        nonReentrant
        nonZeroKey(contextKey) 
    {

        bytes32 ProofClaimNullifier = bytes32(publicSignals[0]);
        bytes32 ProofSubmissionNullifier = bytes32(publicSignals[1]);
        bytes32 ProofProposalContextHash = bytes32(publicSignals[2]);

        // Checks:
        // Check if the proposal has been submitted
        if(!submissionNullifiers[ProofSubmissionNullifier]) revert ProposalHasNotBeenSubmitted();

        // Check if the claim nullifier has already been used
        if(claimNullifiers[ProofClaimNullifier]) revert ProposalHasAlreadyBeenClaimed();

        // Check if the context hash matches the one in the public signals
        if(ProofProposalContextHash != contextKey) revert InvalidContextHash();

        // Effects:
        // Mark the claim nullifier as used before verification to prevent re-entrancy attacks
        claimNullifiers[ProofClaimNullifier] = true;
        emit ClaimVerified(contextKey, ProofClaimNullifier, ProofSubmissionNullifier);

        // Interactions:
        // Verify the proof using the claim verifier contract
        bool isValidClaim = claimVerifier.verifyProof(proof, publicSignals);
        if(!isValidClaim) {
            revert InvalidClaimProof(contextKey, ProofClaimNullifier, ProofSubmissionNullifier);
        }
    }

// ====================================================================================================================
//                                       RECEIVE & FALLBACK FUNCTIONS
// ====================================================================================================================

    /**
    * @notice Prevents ETH from being sent to this contract
    */
    receive() external payable {
        revert ETHTransfersNotAccepted();
    }

    /**
    * @notice Prevents ETH from being sent with calldata to this contract
    * @dev Handles unknown function calls and ETH transfers with data
    */
    fallback() external payable {
        if (msg.value > 0) {
            revert ETHTransfersNotAccepted();
        } else {
            revert UnknownFunctionCall();
        }
    }

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view override(IVersioned, IProposalManager) returns (string memory) {
        return "ProposalManager v1.0.0"; 
    }

}