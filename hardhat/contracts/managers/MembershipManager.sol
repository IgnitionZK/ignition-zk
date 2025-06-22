// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IMembershipVerifier.sol";
//import "../interfaces/IERC721IgnitionZK.sol";
//import { ERC721IgnitionZK } from "../token/ERC721IgnitionZK.sol";
import { IERC721IgnitionZK } from "../interfaces/IERC721IgnitionZK.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// import Clones for NFT factory pattern:
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title MembershipManager
 * @dev A contract to manage membership in groups using Merkle trees and zk-SNARKs.
 * It allows for initializing and updating Merkle roots, verifying proofs, managing group NFTs,
 * and adding/removing members. This contract acts as a factory for ERC721IgnitionZK NFT contracts.
 * @notice This contract serves as the central hub for managing group memberships, utilizing a
 * zk-SNARK verifier for privacy-preserving proof verification and dedicated ERC721 NFTs for membership tokens.
 * It is designed to be upgradeable via the UUPS proxy pattern by the governor.
 */
contract MembershipManager is Initializable, UUPSUpgradeable, OwnableUpgradeable {

// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
    // Merkle Root errors:
    error RootCannotBeZero();
    error InvalidMerkleRoot();
    error NewRootMustBeDifferent();
    error RootNotYetInitialized();
    error RootAlreadyInitialized();
    // Nft errors:
    error GroupNftNotSet();
    error GroupNftAlreadySet();
    error NftAddressCannotBeZero();
    error NftMustBeERC721();
    error MintingFailed(string reason);
    // Proof errors:
    error InvalidProof(bytes32 groupKey, bytes32 nullifier);
    error NullifierAlreadyUsed();
    error InvalidGroupKey();
    // Member errors:
    error MemberAddressCannotBeZero();
    error MemberAlreadyHasToken();
    error MemberDoesNotHaveToken();
    error MemberBatchTooLarge();
    error NoMembersProvided();
    error MemberMustBeEOA();
    // General errors:
    error VerifierAddressCannotBeZero();
    error GovernorAddressCannotBeZero();
    error KeyCannotBeZero();
    
// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

    /**
        * @dev Emitted when a new Merkle root is initialized for a group.
        * @param groupKey The unique identifier for the group.
        * @param root The initialized Merkle root for the group.
        * @notice This event is emitted when the initial root is set for a group, allowing for future updates and proof verifications.
     */
    event RootInitialized(bytes32 indexed groupKey, bytes32 root);
    /**
     * @notice Emitted when an existing Merkle root for a group is updated.
     * @param groupKey The unique identifier for the group.
     * @param oldRoot The previous Merkle root.
     * @param newRoot The new Merkle root.
     */
    event RootSet(bytes32 indexed groupKey, bytes32 oldRoot, bytes32 newRoot);
     /**
     * @notice Emitted after a zk-SNARK proof is verified.
     * @param groupKey The unique identifier for the group.
     * @param nullifier A unique identifier derived from the proof, preventing double-use.
     */
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed nullifier); 
    /**
     * @notice Emitted when a new ERC721 NFT contract is deployed for a group.
     * @param groupKey The unique identifier for the group.
     * @param nftAddress The address of the newly deployed NFT contract.
     * @param name The name of the new NFT collection.
     * @param symbol The symbol of the new NFT collection.
     */
    event GroupNftDeployed(bytes32 indexed groupKey, address indexed nftAddress, string name, string symbol);
    /**
     * @notice Emitted when a member is successfully added to a group and a token is minted.
     * @param groupKey The unique identifier for the group.
     * @param memberAddress The address of the new member.
     * @param tokenId The ID of the minted membership token.
     */
    event MemberNftMinted(bytes32 indexed groupKey, address indexed memberAddress, uint256 tokenId);
    /**
     * @notice Emitted when a member is successfully removed from a group and their token is burned.
     * @param groupKey The unique identifier for the group.
     * @param memberAddress The address of the removed member.
     * @param tokenId The ID of the burned membership token.
     */
    event MemberNftBurned(bytes32 indexed groupKey, address indexed memberAddress, uint256 tokenId);
    /**
     * @notice Emitted when a role is revoked from the NFT clone.
     * @param nftClone The address of the NFT contract clone from which the role was revoked.
     * @param role The role that was revoked (e.g., MINTER_ROLE, BURNER_ROLE).
     * @param revokedFrom The address from which the role was revoked (usually this contract).
     */
    event RoleRevoked(address indexed nftClone, bytes32 role, address indexed revokedFrom);
    /**
     * @notice Emitted when a role is granted to an address in the NFT clone.
     * @param nftClone The address of the NFT contract clone to which the role was granted.
     * @param role The role that was granted (e.g., MINTER_ROLE, BURNER_ROLE).
     * @param grantedTo The address to which the role was granted.
     */
    event RoleGranted(address indexed nftClone, bytes32 role, address indexed grantedTo);

// ====================================================================================================================
//                                          STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================
    // Mappings:
    /// @dev Maps a unique group key to its current Merkle root.
    mapping(bytes32 => bytes32) private groupRoots; 
    /// @dev Maps a group key to a mapping of nullifiers, tracking used nullifiers for that group.
    mapping(bytes32 => mapping(bytes32 => bool)) private groupNullifiers;
    /// @dev Maps a group key to the address of its associated ERC721 NFT contract.
    mapping(bytes32 => address) private groupNftAddresses; 

    // State variables:
    /// @dev The address of the zk-SNARK verifier contract.
    IMembershipVerifier private verifier;
    /// @dev The address of the NFT implementation contract used for creating new group NFTs.
    address private nftImplementation;

    // Constants:
    /// @dev The maximum number of members that can be added in a single batch transaction.
    uint256 private constant MAX_MEMBERS_BATCH = 30;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Ensures that the provided group key is not zero.
     * @param groupKey The unique identifier for the group.
     */
    modifier nonZeroKey(bytes32 groupKey) {
        if (groupKey == bytes32(0)) revert KeyCannotBeZero();
        _;
    }

    /**
     * @dev Ensures that the provided address is not the zero address.
     * @param addr The address to check.
     */
    modifier nonZeroAddress(address addr) {
         if (addr == address(0)) revert MemberAddressCannotBeZero();
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
        address _nftImplementation
    ) external initializer {
        // this makes the MembershipManager owner == governor so that only the governor can update the MembershipManager logic
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();
        if (_verifier == address(0)) revert VerifierAddressCannotBeZero();
        if (_governor == address(0)) revert GovernorAddressCannotBeZero();
        if (_nftImplementation == address(0)) revert NftAddressCannotBeZero();
        if (!IERC165(_nftImplementation).supportsInterface(type(IERC721).interfaceId)) revert NftMustBeERC721();

        //governor = _governor;
        verifier = IMembershipVerifier(_verifier);
        nftImplementation = _nftImplementation;
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Deploys a new ERC721 NFT contract instance for a given group.
     * @dev Only the governor can call this. The newly deployed NFT contract's owner is set to the governor.
     * @param groupKey The unique identifier for the group.
     * @param name The desired name for the new ERC721 collection.
     * @param symbol The desired symbol for the new ERC721 collection.
     * @return newNftAddress The address of the newly deployed NFT contract.
     * @custom:error GroupNftAlreadySet If an NFT contract has already been deployed for this group key.
     */
    function deployGroupNft(
        bytes32 groupKey,
        string calldata name, 
        string calldata symbol
        ) external onlyOwner nonZeroKey(groupKey) returns (address) {
        if (groupNftAddresses[groupKey] != address(0)) revert GroupNftAlreadySet();

        bytes32 salt = groupKey;
        address clone = Clones.cloneDeterministic(
            nftImplementation, 
            salt // Use groupKey as the salt for deterministic deployment
        );

        IERC721IgnitionZK(clone).initialize(
            address(this), // DEFAULT_ADMIN_ROLE will be this contract
            address(this), // MINTER_ROLE will be this contract
            address(this), // BURNER_ROLE will be this contract
            name, 
            symbol
        );
        groupNftAddresses[groupKey] = clone;

        emit GroupNftDeployed(groupKey, clone, name, symbol);
        return clone;
    }

    /**
     * @notice Initializes the first Merkle root for a specific group.
     * @dev Can only be called once per `groupKey` by the governor.
     * @param initialRoot The initial Merkle root to set.
     * @param groupKey The unique identifier for the group.
     * @custom:error RootAlreadyInitialized If a root for the given group key has already been set.
     * @custom:error RootCannotBeZero If the provided initial root is zero.
     */
    function initRoot(bytes32 initialRoot, bytes32 groupKey) external onlyOwner nonZeroKey(groupKey) {
        bytes32 currentRoot = groupRoots[groupKey];
        _mustHaveSetGroupNft(groupKey);
        if (currentRoot != bytes32(0)) revert RootAlreadyInitialized();
        if (initialRoot == bytes32(0)) revert RootCannotBeZero();

        groupRoots[groupKey] = initialRoot; 
        emit RootInitialized(groupKey, initialRoot);
    }
    
    /**
     * @notice Updates the Merkle root for an existing group.
     * @dev Can only be called by the governor.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     * @custom:error RootNotYetInitialized If no root has been set for the group yet.
     * @custom:error RootCannotBeZero If the new root is zero.
     * @custom:error NewRootMustBeDifferent If the new root is identical to the current root.
     */
    function setRoot(bytes32 newRoot, bytes32 groupKey) external onlyOwner nonZeroKey(groupKey) {
        bytes32 currentRoot = groupRoots[groupKey];
        _mustHaveSetGroupNft(groupKey);

        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (newRoot == bytes32(0)) revert RootCannotBeZero();
        if (newRoot == currentRoot) revert NewRootMustBeDifferent();
        
        groupRoots[groupKey] = newRoot;
        emit RootSet(groupKey, currentRoot, newRoot);
    }

    /**
     * @notice Verifies a zk-SNARK proof against a group's current Merkle root and marks the nullifier as used.
     * @dev Can only be called by the governor. Prevents double-spending by checking nullifier usage.
     * @param proof The zk-SNARK proof data.
     * @param publicSignals The public signals associated with the proof, including root and nullifier.
     * @param groupKey The unique identifier for the group to verify against.
     * @custom:error RootNotYetInitialized If no root has been set for the group yet.
     * @custom:error InvalidMerkleRoot If the proof's root does not match the group's current root.
     * @custom:error NullifierAlreadyUsed If the nullifier has already been consumed.
     * @custom:error InvalidProof If the zk-SNARK proof itself is invalid.
     */
    function verifyProof(
        uint256[24] calldata proof, 
        uint256[3] calldata publicSignals,
        bytes32 groupKey
        ) external onlyOwner nonZeroKey(groupKey) {
        bytes32 proofRoot = bytes32(publicSignals[1]);
        bytes32 nullifier = bytes32(publicSignals[0]);
        bytes32 externalNullifier = bytes32(publicSignals[2]);
        bytes32 currentRoot = groupRoots[groupKey];

        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (currentRoot != proofRoot) revert InvalidMerkleRoot();
        if (groupNullifiers[groupKey][nullifier]) revert NullifierAlreadyUsed();
        if (externalNullifier != groupKey) revert InvalidGroupKey();

        bool isValid = verifier.verifyProof(proof, publicSignals);
        if (!isValid) {
            revert InvalidProof(groupKey, nullifier);
        }

        groupNullifiers[groupKey][nullifier] = true;
        emit ProofVerified(groupKey, nullifier);
    }

    /** 
     * @notice Adds a new member to a specific group by minting an ERC721 token.
     * @dev Only the governor can call this. Ensures only one token per member per group.
     * @param memberAddress The address of the member to add.
     * @param groupKey The identifier of the group.
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error MemberAddressCannotBeZero If the member address is zero.
     * @custom:error MemberAlreadyHasToken If the member already holds a token for this group.
     * @custom:error MemberMustBeEOA If the member address is a contract address (and not an EOA).
     * @custom:error MintingFailed If the `safeMint` call to the NFT contract fails.
     */
    function mintNftToMember(
        address memberAddress, 
        bytes32 groupKey
        ) public onlyOwner nonZeroKey(groupKey) nonZeroAddress(memberAddress) {

        address groupNftAddress = _mustHaveSetGroupNft(groupKey);
        if (memberAddress.code.length != 0) revert MemberMustBeEOA();

        IERC721IgnitionZK nft = IERC721IgnitionZK(groupNftAddress);
        uint256 memberBalance = nft.balanceOf(memberAddress);
        if (memberBalance > 0) revert MemberAlreadyHasToken();

        uint256 mintedTokenId;
  
        try nft.safeMint(memberAddress) returns (uint256 _tokenId) {
            mintedTokenId = _tokenId;
            emit MemberNftMinted(groupKey, memberAddress, mintedTokenId);
        } catch Error(string memory reason) {
            revert MintingFailed(reason);
        }
    }

    /**
     * @notice Adds multiple members to a specific group in a single transaction.
     * @dev Only the governor can call this. Iterates and calls `addMember` for each address.
     * @param memberAddresses An array of addresses of members to add.
     * @param groupKey The identifier of the group.
     * @custom:error NoMembersProvided If the `memberAddresses` array is empty.
     * @custom:error MemberBatchTooLarge If the number of members exceeds `MAX_MEMBERS_BATCH`.
     * @custom:error (Propagates errors from `addMember`)
     */
    function mintNftToMembers(
        address[] calldata memberAddresses, 
        bytes32 groupKey
        ) public onlyOwner nonZeroKey(groupKey) {
        uint256 memberCount = memberAddresses.length;

        if (memberCount == 0) revert NoMembersProvided();
        if (memberCount > MAX_MEMBERS_BATCH) revert MemberBatchTooLarge();

        for (uint256 i = 0; i < memberCount; i++) {
            mintNftToMember(memberAddresses[i], groupKey);
        }
    }

    /**
     * @notice Removes a member from a specific group by burning their membership token.
     * @dev Only the governor can call this.
     * @param memberAddress The address of the member to remove.
     * @param groupKey The identifier of the group.
     * @custom:error MemberAddressCannotBeZero If the member address is zero.
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error MemberDoesNotHaveToken If the member does not hold a token for this group.
     */
    function burnMemberNft(
        address memberAddress, 
        bytes32 groupKey
        ) external onlyOwner nonZeroKey(groupKey) nonZeroAddress(memberAddress) {
        address groupNftAddress = _mustHaveSetGroupNft(groupKey);
        IERC721IgnitionZK nft = IERC721IgnitionZK(groupNftAddress);
        uint256 memberBalance = nft.balanceOf(memberAddress);
        if (memberBalance == 0) revert MemberDoesNotHaveToken();

        uint256 tokenIdToBurn = nft.tokenOfOwnerByIndex(memberAddress, 0);
        nft.revokeMembershipToken(tokenIdToBurn);
        emit MemberNftBurned(groupKey, memberAddress, tokenIdToBurn);
    }

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Retrieves the current Merkle root for a specific group.
     * @dev Only callable by the owner (governor). Returns the stored root for the given group key.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group. Returns bytes32(0) if no root has been set.
     * @custom:error (No custom errors thrown by this function)
     */
    function getRoot(bytes32 groupKey) external view onlyOwner returns (bytes32){
        return groupRoots[groupKey];
    }

    /**
     * @notice Retrieves the address of the ERC721 NFT contract for a specific group.
     * @dev Only callable by the owner (governor). Returns the NFT contract address for the given group key.
     * @param groupKey The unique identifier for the group.
     * @return address of the ERC721 NFT contract associated with the specified group key.
     */
    function getGroupNftAddress(bytes32 groupKey) external view onlyOwner nonZeroKey(groupKey) returns (address) {
        return groupNftAddresses[groupKey];
    }

    /**
     * @notice Retrieves the nullifier status for a specific group and nullifier.
     * @dev Only callable by the owner (governor). Returns true if the nullifier has been used.
     * @param groupKey The unique identifier for the group.
     * @param nullifier The nullifier to check.
     * @return bool indicating whether the nullifier has been used.
     */
    function getNullifierStatus(bytes32 groupKey, bytes32 nullifier) external view onlyOwner returns (bool) {
        return groupNullifiers[groupKey][nullifier];
    }

    /**
     * @notice Retrieves the address of the zk-SNARK verifier contract.
     * @dev Only callable by the owner (governor).
     * @return The address of the verifier contract.
     */
    function getVerifier() external view onlyOwner returns (address) {
        return address(verifier);
    }

    /**
     * @notice Retrieves the address of the governor contract.
     * @dev Only callable by the owner (governor).
     * @return The address of the governor contract.
     */
    function getGovernor() external view onlyOwner returns (address) {
        return owner();
    }

    /**
     * @notice Retrieves the address of the NFT implementation contract.
     * @dev Only callable by the owner (governor).
     * @return address of the NFT implementation contract.
     */
    function getNftImplementation() external view onlyOwner returns (address) {
        return nftImplementation;
    }

    /**
     * @notice Retrieves the maximum number of members that can be added in a single batch transaction.
     * @dev Only callable by the owner (governor).
     * @return The maximum batch size for member additions.
     */
    function getMaxMembersBatch() external view onlyOwner returns (uint256) {
        return MAX_MEMBERS_BATCH;
    }

// ====================================================================================================================
//                                       EXTERNAL HELPER FUNCTIONS
// ====================================================================================================================

    /** 
     * @notice Revokes the MINTER_ROLE from the specified NFT clone.
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     */
    function revokeMinterRole(address nftClone) external onlyOwner nonZeroAddress(nftClone) {
        _revokeRole(nftClone, IERC721IgnitionZK(nftClone).MINTER_ROLE());
    }

    /** 
     * @notice Revokes the BURNER_ROLE from the specified NFT clone.
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     */
    function revokeBurnerRole(address nftClone) external onlyOwner nonZeroAddress(nftClone) {
        _revokeRole(nftClone, IERC721IgnitionZK(nftClone).BURNER_ROLE());
    }

    /**
     * @notice Grants the MINTER_ROLE to the specified address in the NFT clone.
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param grantTo The address to which to grant the role.
     */
    function grantMinterRole(address nftClone, address grantTo) external onlyOwner nonZeroAddress(nftClone) nonZeroAddress(grantTo) {
        _grantRole(nftClone, IERC721IgnitionZK(nftClone).MINTER_ROLE(), grantTo);
    }

    /**
     * @notice Grants the BURNER_ROLE to the specified address in the NFT clone.
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param grantTo The address to which to grant the role.
     */
    function grantBurnerRole(address nftClone, address grantTo) external onlyOwner nonZeroAddress(nftClone) nonZeroAddress(grantTo) {
        _grantRole(nftClone, IERC721IgnitionZK(nftClone).BURNER_ROLE(), grantTo);
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Revokes a specific role from the NFT clone.
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     * @param role The role to revoke (e.g., MINTER_ROLE, BURNER_ROLE).
     */
    function _revokeRole(address nftClone, bytes32 role) private {
        IERC721IgnitionZK nft = IERC721IgnitionZK(nftClone);
        nft.revokeRole(role, address(this));

        emit RoleRevoked(nftClone, role, address(this));
    }

    /**
     * @notice Grants a specific role to an address in the NFT clone.
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param role The role to grant (e.g., MINTER_ROLE, BURNER_ROLE).
     * @param grantTo The address to which to grant the role.
     */
    function _grantRole(address nftClone, bytes32 role, address grantTo) private {
        IERC721IgnitionZK nft = IERC721IgnitionZK(nftClone);
        nft.grantRole(role, grantTo);

        emit RoleGranted(nftClone, role, grantTo);
    }

    /**
     * @notice Ensures that a group NFT is deployed for the specified group key.
     * @param groupKey The unique identifier for the group.
     * @return address of the ERC721 NFT contract associated with the specified group key.
     */
    function _mustHaveSetGroupNft(bytes32 groupKey) private view returns (address) {
        address nftAddress = groupNftAddresses[groupKey];
        if (nftAddress == address(0)) revert GroupNftNotSet();
        return nftAddress;
    }

}