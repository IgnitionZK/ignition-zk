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

    // Custom errors:
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
    error InvalidProof();
    error NullifierAlreadyUsed();
    // Member errors:
    error MemberAddressCannotBeZero();
    error MemberAlreadyHasToken();
    error MemberDoesNotHaveToken();
    error MemberHasMultipleTokens();
    error MemberBatchTooLarge();
    error NoMembersProvided();
    error MemberMustBeEOA();
    // General errors:
    error VerifierAddressCannotBeZero();
    error GovernorAddressCannotBeZero();
    

    // Events:
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
     * @param isValid True if the proof was successfully verified, false otherwise.
     */
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed nullifier, bool isValid); 
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

// ====================================================================================================================
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
    /// @dev The address of the governor (DAO) responsible for core contract management and upgrades.
    address private governor;

    // Constants:
    /// @dev The maximum number of members that can be added in a single batch transaction.
    uint256 private constant MAX_MEMBERS_BATCH = 30;

    address private nftImplementation;

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's governor.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner() {}

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

        governor = _governor;
        verifier = IMembershipVerifier(_verifier);
        nftImplementation = _nftImplementation;
    }


    /**
     * @notice Initializes the first Merkle root for a specific group.
     * @dev Can only be called once per `groupKey` by the governor.
     * @param initialRoot The initial Merkle root to set.
     * @param groupKey The unique identifier for the group.
     * @custom:error RootAlreadyInitialized If a root for the given group key has already been set.
     * @custom:error RootCannotBeZero If the provided initial root is zero.
     */
    function initRoot(bytes32 initialRoot, bytes32 groupKey) external onlyOwner {
        bytes32 currentRoot = groupRoots[groupKey];
        address nftAddress = groupNftAddresses[groupKey];

        if (nftAddress == address(0)) revert GroupNftNotSet();
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
    function setRoot(bytes32 newRoot, bytes32 groupKey) external onlyOwner {
        bytes32 currentRoot = groupRoots[groupKey];
        address nftAddress = groupNftAddresses[groupKey];

        if (nftAddress == address(0)) revert GroupNftNotSet();
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (newRoot == bytes32(0)) revert RootCannotBeZero();
        if (newRoot == currentRoot) revert NewRootMustBeDifferent();
        
        groupRoots[groupKey] = newRoot;
        emit RootSet(groupKey, currentRoot, newRoot);
    }

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
        uint256[2] calldata publicSignals,
        bytes32 groupKey
        ) external onlyOwner {
        bytes32 proofRoot = bytes32(publicSignals[1]);
        bytes32 nullifier = bytes32(publicSignals[0]);
        bytes32 currentRoot = groupRoots[groupKey];

        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (currentRoot != proofRoot) revert InvalidMerkleRoot();
        if (groupNullifiers[groupKey][nullifier]) revert NullifierAlreadyUsed();

        bool isValid = verifier.verifyProof(proof, publicSignals);
        if (!isValid) revert InvalidProof();

        groupNullifiers[groupKey][nullifier] = true;
        emit ProofVerified(groupKey, nullifier, isValid);
    }

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
        ) external onlyOwner() returns (address){
        if (groupNftAddresses[groupKey] != address(0)) revert GroupNftAlreadySet();

        bytes32 salt = groupKey;
        address clone = Clones.cloneDeterministic(
            nftImplementation, 
            salt // Use groupKey as the salt for deterministic deployment
        );

        IERC721IgnitionZK(clone).initialize(
            governor, // DEFAULT_ADMIN_ROLE
            address(this), // MINTER_ROLE will be this contract
            address(this), // BURNER_ROLE will be this contract
            name, 
            symbol
        );

        /*
        ERC721IgnitionZK newNft = new ERC721IgnitionZK(
            governor, // DEFAULT_ADMIN_ROLE
            address(this), // MINTER_ROLE will be this contract
            address(this), // BURNER_ROLE will be this contract
            name, 
            symbol
            );
        address newNftAddress = address(newNft);
        */
        groupNftAddresses[groupKey] = clone;

        emit GroupNftDeployed(groupKey, clone, name, symbol);
        return clone;
    }

    /**
     * @notice Retrieves the address of the ERC721 NFT contract for a specific group.
     * @dev Only callable by the owner (governor). Returns the NFT contract address for the given group key.
     * @param groupKey The unique identifier for the group.
     * @return address of the ERC721 NFT contract associated with the specified group key.
     */
    function getGroupNftAddress(bytes32 groupKey) external view onlyOwner returns (address) {
        return groupNftAddresses[groupKey];
    }

    /** 
     * @notice Adds a new member to a specific group by minting an ERC721 token.
     * @dev Only the governor can call this. Ensures only one token per member per group.
     * @param memberAddress The address of the member to add.
     * @param groupKey The identifier of the group.
     * @custom:error MemberAddressCannotBeZero If `memberAddress` is the zero address.
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error MemberAlreadyHasToken If the member already holds a token for this group.
     * @custom:error MemberMustBeEOA If the member address is a contract address (and not an EOA).
     * @custom:error MintingFailed If the `safeMint` call to the NFT contract fails.
     */
    function mintNftToMember(
        address memberAddress, 
        bytes32 groupKey
        ) public onlyOwner() {
        
        address groupNftAddress = groupNftAddresses[groupKey];
        IERC721IgnitionZK nft = IERC721IgnitionZK(groupNftAddress);
        uint256 memberBalance = nft.balanceOf(memberAddress);
        uint256 mintedTokenId;

        if (memberAddress == address(0)) revert MemberAddressCannotBeZero();
        if (groupNftAddress == address(0)) revert GroupNftNotSet();
        if (memberBalance > 0) revert MemberAlreadyHasToken();
        if (memberAddress.code.length != 0) revert MemberMustBeEOA();
    
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
        ) public onlyOwner() {
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
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error MemberDoesNotHaveToken If the member does not hold a token for this group.
     * @custom:error MemberHasMultipleTokens If the member holds more than one token for this group (violates 1:1 model).
     * @custom:error MemberAddressCannotBeZero If `memberAddress` is the zero address.
     */
    function burnMemberNft(
        address memberAddress, 
        bytes32 groupKey
        ) external onlyOwner() {
        address groupNftAddress = groupNftAddresses[groupKey];
        if (groupNftAddress == address(0)) revert GroupNftNotSet();

        IERC721IgnitionZK nft = IERC721IgnitionZK(groupNftAddress);
        uint256 memberBalance = nft.balanceOf(memberAddress);

        if (memberBalance == 0) revert MemberDoesNotHaveToken();
        if (memberBalance > 1 ) revert MemberHasMultipleTokens();
        if (memberAddress == address(0)) revert MemberAddressCannotBeZero();

        uint256 tokenIdToBurn = nft.tokenOfOwnerByIndex(memberAddress, 0);
        nft.revokeMembershipToken(tokenIdToBurn);
        emit MemberNftBurned(groupKey, memberAddress, tokenIdToBurn);
    }

}