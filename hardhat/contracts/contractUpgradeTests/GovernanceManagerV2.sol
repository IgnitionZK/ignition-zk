// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// interfaces
import "../interfaces/IMembershipManager.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract GovernanceManagerV2 is Initializable, UUPSUpgradeable, OwnableUpgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================

    // Authorization errors:
    error OnlyRelayerAllowed();
    // General errors
    error RelayerAddressCannotBeZero();
    error MembershipAddressCannotBeZero();
    error NewRelayerMustBeDifferent();

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

// ====================================================================================================================
//                                              STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================

    /// @dev The address of the designated relayer, authorized to update roots and verify proofs.
    address private relayer;
    /// @dev The address of the membership manager
    address private membershipManager;

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

// ====================================================================================================================
//                                 CONSTRUCTOR / INITIALIZER / UPGRADE AUTHORIZATION
// ====================================================================================================================
    /**
     * @dev Initializes the contract with the initial owner, relayer, and membership manager addresses.
     * @param _initialOwner The address of the initial owner of the contract.
     * @param _relayer The address of the relayer, which must not be zero.
     * @param _membershipManager The address of the membership manager, which must not be zero.
     * @custom:error RelayerAddressCannotBeZero If the provided relayer address is zero.
     * @custom:error MembershipAddressCannotBeZero If the provided membership manager address is zero.
     */
    function initialize(
        address _initialOwner,
        address _relayer,
        address _membershipManager
    ) external initializer {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();

        if (_relayer == address(0)) revert RelayerAddressCannotBeZero();
        if (_membershipManager == address(0)) revert MembershipAddressCannotBeZero();

        relayer = _relayer;
        membershipManager = _membershipManager;
        emit RelayerSet(_relayer);
    }

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Sets a new relayer address.
     * @dev Only the owner can call this function.
     * @param _relayer The new address for the relayer.
     * @custom:error RelayerAddressCannotBeZero If the provided relayer address is zero.
     * @custom:error NewRelayerMustBeDifferent If the new relayer address is the same as the current one.
     */
    function setRelayer(address _relayer) external onlyOwner {
        if (_relayer == address(0)) revert RelayerAddressCannotBeZero();
        if (_relayer == relayer) revert NewRelayerMustBeDifferent();

        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================

    /**
     * @notice Sets a new membership manager address.
     * @dev Only the relayer can call this function.
     * @param initialRoot The initial Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function delegateInitRoot(bytes32 initialRoot, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).initRoot(initialRoot, groupKey);
    }

    /**
     * @notice Delegates the setRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function delegateSetRoot(bytes32 newRoot, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).setRoot(newRoot, groupKey);
    }

    /**
     * @notice Delegates the verifyProof call to the membership manager.
     * @dev Only callable by the relayer.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param groupKey The unique identifier for the group.
     */
    function delegateVerifyProof(
        uint256[24] calldata proof,
        uint256[3] calldata publicSignals,
        bytes32 groupKey
    ) external onlyRelayer {
        IMembershipManager(membershipManager).verifyProof(proof, publicSignals, groupKey);
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
        return IMembershipManager(membershipManager).deployGroupNft(groupKey, name, symbol);
    }

    /**
     * @notice Delegates the mintNftToMember call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddress The address of the member to add.
     * @param groupKey The unique identifier for the group.
     */
    function delegateMintNftToMember(address memberAddress, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).mintNftToMember(memberAddress, groupKey);
    }

    /**
     * @notice Delegates the mintNftToMembers call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddresses The addresses of the members to add.
     * @param groupKey The unique identifier for the group.
     */
    function delegateMintNftToMembers(address[] calldata memberAddresses, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).mintNftToMembers(memberAddresses, groupKey);
    }

    /**
     * @notice Delegates the burnMemberNft call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddress The address of the member to remove.
     * @param groupKey The unique identifier for the group.
     */
    function delegateBurnMemberNft(address memberAddress, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).burnMemberNft(memberAddress, groupKey);
    }

// ====================================================================================================================
//                           EXTERNAL VIEW FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================

    /**
     * @notice Delegates the getRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group.
     */
    function delegateGetRoot(bytes32 groupKey) external view onlyRelayer returns (bytes32) {
        return IMembershipManager(membershipManager).getRoot(groupKey);
    }

    /**
     * @notice Delegates the getVerifier call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The address of the verifier contract.
     */
    function delegateGetVerifier() external view onlyRelayer returns (address) {
        return IMembershipManager(membershipManager).getVerifier();
    }

    /**
     * @notice Delegates the getGovernor call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The address of the governor contract.
     */
    function delegateGetGovernor() external view onlyRelayer returns (address) {
        return IMembershipManager(membershipManager).getGovernor();
    }

    /**
     * @notice Delegates the getNftImplementation call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The address of the NFT implementation contract.
     */
    function delegateGetNftImplementation() external view onlyRelayer returns (address) {
        return IMembershipManager(membershipManager).getNftImplementation();
    }

    /**
     * @notice Delegates the getMaxMembersBatch call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The maximum batch size for member additions.
     */
    function delegateGetMaxMembersBatch() external view onlyRelayer returns (uint256) {
        return IMembershipManager(membershipManager).getMaxMembersBatch();
    }

    /**
     * @notice Delegates the getGroupNftAddress call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The address of the ERC721 NFT contract associated with the specified group key.
     */
    function delegateGetGroupNftAddress(bytes32 groupKey) external view onlyRelayer returns (address) {
        return IMembershipManager(membershipManager).getGroupNftAddress(groupKey);
    }

    /**
     * @notice Delegates the getNullifier call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param nullifier The nullifier to check.
     * @return bool indicating whether the nullifier has been used.
     */
    function delegateGetNullifierStatus(bytes32 groupKey, bytes32 nullifier) external view onlyRelayer returns (bool) {
        return IMembershipManager(membershipManager).getNullifierStatus(groupKey, nullifier);
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


}