// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// interfaces
import { IMembershipManager } from "../interfaces/IMembershipManager.sol";
import { IProposalManager } from "../interfaces/IProposalManager.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

/**
 * @title GovernanceManager
 * @notice This contract manages governance-related functions and access control for the IgnitionZK protocol.
 * It allows for delegation of membership management and proposal verification tasks to designated relayers.
 * The contract is upgradeable and follows the UUPS pattern, ensuring that governance can adapt to future requirements.
 */

contract GovernanceManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, ERC165Upgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================

    // ====================================================================================================
    // AUTHORIZATION ERRORS
    // ====================================================================================================

    /// @notice Thrown if a function is called by an address that is not the designated relayer.
    error OnlyRelayerAllowed();

    // ====================================================================================================
    // GENERAL ERRORS
    // ====================================================================================================

    /// @notice Thrown if the new relayer address is the same as the current one.
    error NewRelayerMustBeDifferent();

    /// @notice Thrown if an address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if an address is not a contract.
    error AddressIsNotAContract();

    /// @notice Thrown if the new address is the same as the current one.
    error NewAddressMustBeDifferent();

    /// @notice Thrown if the expected interface ID is not supported by the target contract address.
    error InterfaceIdNotSupported();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

    /**
     * @notice Emitted when the relayer address is updated.
     * @param newRelayer The new address of the relayer.
     */
    event RelayerSet(address indexed newRelayer);

    /**
     * @notice Emitted when the membership manager address is updated.
     * @param newMembershipManager The new address of the membership manager.
     */
    event MembershipManagerSet(address indexed newMembershipManager);

    /**
     * @notice Emitted when the proposal manager address is updated.
     * @param newProposalManager The new address of the proposal manager.
     */
    event ProposalManagerSet(address indexed newProposalManager);

// ====================================================================================================================
//                                              STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================

    /// @dev The address of the designated relayer, authorized to update roots and verify proofs.
    address private relayer;
    
    /// @dev The interface of the membership manager contract
    IMembershipManager private membershipManager;

    /// @dev The interface of the proposal manager contract
    IProposalManager private proposalManager;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Restricts function execution to the designated relayer address.
     */
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
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
     * @dev Initializes the contract with the initial owner, relayer, and membership manager addresses.
     * @param _initialOwner The address of the initial owner of the contract.
     * @param _relayer The address of the relayer, which must not be zero.
     * @param _membershipManager The address of the membership manager, which must not be zero.
     * @param _proposalManager The address of the proposal manager, which must not be zero.
     * @custom:error RelayerAddressCannotBeZero If the provided relayer address is zero.
     * @custom:error MembershipAddressCannotBeZero If the provided membership manager address is zero.
     * @custom:error ProposalAddressCannotBeZero If the provided proposal manager address is zero.
     */
    function initialize(
        address _initialOwner,
        address _relayer,
        address _membershipManager,
        address _proposalManager
    ) 
        external 
        initializer 
        nonZeroAddress(_relayer)
        nonZeroAddress(_membershipManager)
        nonZeroAddress(_proposalManager)
    {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        __ERC165_init();

        relayer = _relayer;
        membershipManager = IMembershipManager(_membershipManager);
        proposalManager = IProposalManager(_proposalManager);

        emit RelayerSet(_relayer);
        emit MembershipManagerSet(_membershipManager);
        emit ProposalManagerSet(_proposalManager);
    }

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (NOT FORWARDED)
// ====================================================================================================================

    /**
     * @notice Sets a new relayer address.
     * @dev Only the owner can call this function.
     * @param _relayer The new address for the relayer.
     * @custom:error AddressCannotBeZero If the provided relayer address is zero.
     * @custom:error NewRelayerMustBeDifferent If the new relayer address is the same as the current one.
     */
    function setRelayer(address _relayer) external onlyOwner nonZeroAddress(_relayer) {
        if (_relayer == relayer) revert NewRelayerMustBeDifferent();
        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

    /**
     * @notice Sets a new membership manager address.
     * @dev Only the owner can call this function.
     * @param _membershipManager The new address for the membership manager.
     * @custom:error AddressCannotBeZero If the provided membership manager address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     * @custom:error NewAddressMustBeDifferent If the new address is the same as the
     * current membership manager address.
     * @custom:error InterfaceIdNotSupported If the provided address does not support the IMembership
     * interface.
     */
    function setMembershipManager(address _membershipManager) external onlyOwner nonZeroAddress(_membershipManager) {
        if(_membershipManager.code.length == 0) revert AddressIsNotAContract();
        if(_membershipManager == address(membershipManager)) revert NewAddressMustBeDifferent();

        bytes4 interfaceId = type(IMembershipManager).interfaceId;
        if(!_supportsInterface(_membershipManager, interfaceId)) revert InterfaceIdNotSupported();

        membershipManager = IMembershipManager(_membershipManager);
        emit MembershipManagerSet(_membershipManager);
    }

    /**
     * @notice Sets a new membership manager address.
     * @dev Only the owner can call this function.
     * @param _proposalManager The new address for the proposal manager.
     * @custom:error AddressCannotBeZero If the provided proposal manager address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     * @custom:error NewAddressMustBeDifferent If the new address is the same as the
     * current proposal manager address.
     * @custom:error InterfaceIdNotSupported If the provided address does not support the IProposalManager
     * interface.
     */
    function setProposalManager(address _proposalManager) external onlyOwner nonZeroAddress(_proposalManager) {
        if(_proposalManager.code.length == 0) revert AddressIsNotAContract();
        if(_proposalManager == address(proposalManager)) revert NewAddressMustBeDifferent();

        bytes4 interfaceId = type(IProposalManager).interfaceId;
        if(!_supportsInterface(_proposalManager, interfaceId)) revert InterfaceIdNotSupported();

        proposalManager = IProposalManager(_proposalManager);
        emit ProposalManagerSet(_proposalManager);
    }

// ====================================================================================================================
// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================
// ====================================================================================================================

    // ================================================================================================================
    // 1. MembershipManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the initRoot call to the membership manager.
     * @dev Only the relayer can call this function.
     * @param initialRoot The initial Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function delegateInitRoot(bytes32 initialRoot, bytes32 groupKey) external onlyRelayer {
        membershipManager.initRoot(initialRoot, groupKey);
    }

    /**
     * @notice Delegates the setRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function delegateSetRoot(bytes32 newRoot, bytes32 groupKey) external onlyRelayer {
        membershipManager.setRoot(newRoot, groupKey);
    }

    /**
     * @notice Delegates the deployGroupNft call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param name The name of the new NFT collection.
     * @param symbol The symbol of the new NFT collection.
     * @return address of the newly deployed NFT contract.
     */
    function delegateDeployGroupNft(
        bytes32 groupKey,
        string calldata name,
        string calldata symbol
    ) external onlyRelayer returns (address) {
        return membershipManager.deployGroupNft(groupKey, name, symbol);
    }

    /**
     * @notice Delegates the mintNftToMember call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddress The address of the member to add.
     * @param groupKey The unique identifier for the group.
     */
    function delegateMintNftToMember(address memberAddress, bytes32 groupKey) external onlyRelayer {
        membershipManager.mintNftToMember(memberAddress, groupKey);
    }

    /**
     * @notice Delegates the mintNftToMembers call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddresses The addresses of the members to add.
     * @param groupKey The unique identifier for the group.
     */
    function delegateMintNftToMembers(address[] calldata memberAddresses, bytes32 groupKey) external onlyRelayer {
        membershipManager.mintNftToMembers(memberAddresses, groupKey);
    }

    /**
     * @notice Delegates the burnMemberNft call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddress The address of the member to remove.
     * @param groupKey The unique identifier for the group.
     */
    function delegateBurnMemberNft(address memberAddress, bytes32 groupKey) external onlyRelayer {
        membershipManager.burnMemberNft(memberAddress, groupKey);
    }

    /**
     * @notice Delegates the revokeMinterRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     */
    function delegateRevokeMinterRole(address nftClone) external onlyRelayer {
        membershipManager.revokeMinterRole(nftClone);
    }

    /**
     * @notice Delegates the revokeBurnerRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     */
    function delegateRevokeBurnerRole(address nftClone) external onlyRelayer {
        membershipManager.revokeBurnerRole(nftClone);
    }

    /**
     * @notice Delegates the grantMinterRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     * @param grantTo The address to grant the minter role to.
     */
    function delegateGrantMinterRole(address nftClone, address grantTo) external onlyRelayer {
        membershipManager.grantMinterRole(nftClone, grantTo);
    }

    /**
     * @notice Delegates the grantBurnerRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     * @param grantTo The address to grant the burner role to.
     */
    function delegateGrantBurnerRole(address nftClone, address grantTo) external onlyRelayer {
        membershipManager.grantBurnerRole(nftClone, grantTo);
    }

    // ================================================================================================================
    // 2. ProposalManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the verifyProposal call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param proof The zk-SNARK proof to verify.
     * @param pubSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     */
    function delegateVerifyProposal(
        uint256[24] calldata proof,
        uint256[5] calldata pubSignals,
        bytes32 groupKey,
        bytes32 contextKey
    ) external onlyRelayer {
        bytes32 currentRoot = _getCurrentRoot(groupKey);
        proposalManager.verifyProposal(proof, pubSignals, contextKey, currentRoot);
    }

// ====================================================================================================================
// ====================================================================================================================
//                           EXTERNAL VIEW FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================
// ====================================================================================================================

  
    // ================================================================================================================
    // 1. MembershipManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group.
     */
    function delegateGetRoot(bytes32 groupKey) external view onlyRelayer returns (bytes32) {
        return membershipManager.getRoot(groupKey);
    }

    /**
     * @notice Delegates the getNftImplementation call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The address of the NFT implementation contract.
     */
    function delegateGetNftImplementation() external view onlyRelayer returns (address) {
        return membershipManager.getNftImplementation();
    }

    /**
     * @notice Delegates the getMaxMembersBatch call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The maximum batch size for member additions.
     */
    function delegateGetMaxMembersBatch() external view onlyRelayer returns (uint256) {
        return membershipManager.getMaxMembersBatch();
    }

    /**
     * @notice Delegates the getGroupNftAddress call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The address of the ERC721 NFT contract associated with the specified group key.
     */
    function delegateGetGroupNftAddress(bytes32 groupKey) external view onlyRelayer returns (address) {
        return membershipManager.getGroupNftAddress(groupKey);
    }

    // ================================================================================================================
    // 2. ProposalManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getProposalSubmissionVerifier call to the proposal manager.
     * @dev Only callable by the relayer.
     * @return The address of the proposal submission verifier contract.
     */
    function delegateGetProposalSubmissionVerifier() external view onlyRelayer returns (address) {
        return proposalManager.getProposalSubmissionVerifier();
    }

    /**
     * @notice Delegates the getProposalClaimVerifier call to the proposal manager.
     * @dev Only callable by the relayer.
     * @return The address of the proposal claim verifier contract.
     */
    function delegateGetProposalClaimVerifier() external view onlyRelayer returns (address) {
        return proposalManager.getProposalClaimVerifier();
    }

    /**
     * @notice Delegates the getSubmissionNullifierStatus call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param nullifier The submission nullifier to check.
     * @return bool indicating whether the submission nullifier has been used.
     */
    function delegateGetSubmissionNullifierStatus(bytes32 nullifier) external view onlyRelayer returns (bool) {
        return proposalManager.getSubmissionNullifierStatus(nullifier);
    }

    /**
     * @notice Delegates the getClaimNullifierStatus call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param nullifier The claim nullifier to check.
     * @return bool indicating whether the claim nullifier has been used.
     */
    function delegateGetClaimNullifierStatus(bytes32 nullifier) external view onlyRelayer returns (bool) {
        return proposalManager.getClaimNullifierStatus(nullifier);
    }   

// ====================================================================================================================
//                                   EXTERNAL VIEW FUNCTIONS (NOT FORWARDED)
// ====================================================================================================================

    /**
     * @notice Gets the address of the relayer.
     * @return address of the relayer.
     */
    function getRelayer() external view onlyOwner returns (address) {
        return relayer;
    }

    /**
     * @notice Gets the address of the membership manager.
     * @return address of the membership manager.
     */
    function getMembershipManager() external view onlyOwner returns (address) {
        return address(membershipManager);
    }

    /**
     * @notice Gets the address of the proposal manager.
     * @return address of the proposal manager.
     */
    function getProposalManager() external view onlyOwner returns (address) {
        return address(proposalManager);
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Gets the current Merkle root for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group.
     */
    function _getCurrentRoot(bytes32 groupKey) private view returns(bytes32) {
        return membershipManager.getRoot(groupKey);
    }

    /**
     * @dev Checks if a contract supports a specific interface.
     * @param target The address of the contract to check.
     * @param interfaceId The interface ID to check for support.
     * @return bool indicating whether the contract supports the specified interface.
     */
    function _supportsInterface(address target, bytes4 interfaceId) private view returns (bool) {
        try IERC165(target).supportsInterface(interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

}