// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// OZ imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
// import Clones for NFT factory pattern:
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";

// Interfaces:
import { IERC721IgnitionZK } from "../interfaces/IERC721IgnitionZK.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IMembershipManager } from "../interfaces/managers/IMembershipManager.sol";
import { IMembershipVerifier } from "../interfaces/verifiers/IMembershipVerifier.sol";
import { IVersioned } from "../interfaces/IVersioned.sol";

/**
 * @title MembershipManager
 * @notice This contract serves as the central hub for managing group memberships, utilizing a
 * dedicated ERC721 NFTs for membership tokens.
 * It is designed to be upgradeable via the UUPS proxy pattern by the governor.
 * @dev A contract to manage membership in groups using Merkle trees.
 * It allows for initializing and updating Merkle roots, verifying proofs, managing group NFTs,
 * and adding/removing members. This contract acts as a factory for ERC721IgnitionZK NFT contracts.
 */
contract MembershipManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, IMembershipManager, ERC165Upgradeable, IVersioned {
// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================
    // ====================================================================================================
    // MERKLE ROOT ERRORS
    // ====================================================================================================

    /// @notice Thrown if a Merkle root is zero.
    error RootCannotBeZero();
    
    /// @notice Thrown if the Merkle root does not match the current root.
    error InvalidMerkleRoot();

    /// @notice Thrown if a new Merkle root is the same as the current root.
    error NewRootMustBeDifferent();

    /// @notice Thrown if a Merkle root has not been initialized for a group.
    error RootNotYetInitialized();

    // ====================================================================================================
    // NFT ERRORS
    // ====================================================================================================

    /// @notice Thrown if a group NFT has not been set for a group.
    error GroupNftNotSet();

    /// @notice Thrown if a group NFT has already been set for a group.
    error GroupNftAlreadySet();

    /// @notice Thrown if the NFT implementation does not support the ERC721 interface.
    error NftMustBeERC721();

    /// @notice Thrown if the NFT name is empty or exceeds the maximum length.
    error InvalidNftNameLength();

    /// @notice Thrown if the NFT symbol is empty or exceeds the maximum length.
    error InvalidNftSymbolLength();

    /// @notice Thrown if the `safeMint` call to the NFT contract fails.
    error MintingFailed(string reason);

    // ====================================================================================================
    // PROOF ERRORS
    // ====================================================================================================

    /// @notice Thrown if the zk-SNARK proof is invalid.
    /// @param groupKey The unique identifier for the group associated with the proof.
    error InvalidProof(bytes32 groupKey);

    /// @notice Thrown if the group key in the public signals does not match the expected group key.
    error InvalidGroupKey();

    // ====================================================================================================
    // MEMBER ERRORS
    // ====================================================================================================

    /// @notice Thrown if a member address already has a token for the group.
    error MemberAlreadyHasToken();

    /// @notice Thrown if a member address does not have a token for the group.
    error MemberDoesNotHaveToken();

    /// @notice Thrown if the provided array of member addresses exceeds the maximum allowed batch size.
    error MemberBatchTooLarge();

    /// @notice Thrown if the provided array of member addresses is empty.
    error NoMembersProvided();

    /// @notice Thrown if the member address is not an externally owned account (EOA).
    error MemberMustBeEOA();
    
    // ====================================================================================================
    // GENERAL ERRORS (used in Modifiers)
    // ====================================================================================================

    /// @notice Thrown if a key (groupKey) is zero.
    error KeyCannotBeZero();

    /// @notice Thrown if an address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if the provided address is not a contract.
    error AddressIsNotAContract();

    /// @notice Thrown if ETH is sent to this contract.
    error ETHTransfersNotAccepted();

    /// @notice Thrown when a function not defined in this contract is called.
    error UnknownFunctionCall();
    
// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

    /**
     * @notice This event is emitted when the initial root is set for a group, allowing for future updates and proof verifications.
     * @dev Emitted when a new Merkle root is initialized for a group.
     * @param groupKey The unique identifier for the group.
     * @param root The initialized Merkle root for the group.
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
     */
    event ProofVerified(bytes32 indexed groupKey); 
    
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
    
    /**
     * @notice Emitted when the address of the NFT implementation contract is set.
     * @param nftImplementation The address of the NFT implementation contract.
     */
    event NftImplementationSet(address indexed nftImplementation);

    /**
     * @notice Emitted when the address of the membership verifier contract is set.
     * @param membershipVerifier The address of the membership verifier contract.
     */
    event MembershipVerifierSet(address indexed membershipVerifier);

// ====================================================================================================================
//                                          STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================
    // ====================================================================================================
    // MAPPINGS
    // ====================================================================================================

    /// @dev Maps a unique group key to its current Merkle root.
    mapping(bytes32 => bytes32) public groupRoots; 
    
    /// @dev Maps a group key to the address of its associated ERC721 NFT contract.
    mapping(bytes32 => address) public groupNftAddresses; 

    // ====================================================================================================
    // ADDRESSES
    // ====================================================================================================
    
    /// @dev The address of the NFT implementation contract used for creating new group NFTs.
    address public nftImplementation;

    /// @dev The interface of the membership verifier contract.
    IMembershipVerifier public membershipVerifier;

    // ====================================================================================================
    // CONSTANTS
    // ====================================================================================================

    /// @dev The maximum number of members that can be added in a single batch transaction.
    uint256 public constant MAX_MEMBERS_BATCH = 30;

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
     * after the proxy is deployed. It sets the governor.
     * @dev The governor is set as the owner of this contract, allowing it to manage upgrades and configurations.
     * @dev The NFT implementation address is checked to ensure it supports the ERC721 interface.
     * @param _governor The address of the governor (DAO) contract.
     * @param _nftImplementation The address of the NFT implementation contract to be used for group NFTs.
     * @custom:error AddressCannotBeZero If any of the provided addresses are zero.
     * @custom:error NftMustBeERC721 If the provided NFT implementation does not support the ERC721 interface.
     */
    function initialize
    (
        address _governor, 
        address _nftImplementation,
        address _membershipVerifier
    ) 
        external 
        initializer 
        nonZeroAddress(_governor) 
        nonZeroAddress(_nftImplementation) 
        nonZeroAddress(_membershipVerifier) 
    {
        __Ownable_init(_governor);
        __UUPSUpgradeable_init();
        __ERC165_init();
      
        if (!IERC165(_nftImplementation).supportsInterface(type(IERC721).interfaceId)) revert NftMustBeERC721();
        nftImplementation = _nftImplementation;
        membershipVerifier = IMembershipVerifier(_membershipVerifier);
        emit NftImplementationSet(_nftImplementation);
        emit MembershipVerifierSet(_membershipVerifier);
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @dev This function can only be called by the contract owner (governor).
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     */
    function setMembershipVerifier(address _membershipVerifier) external onlyOwner nonZeroAddress(_membershipVerifier) {
        if(_membershipVerifier.code.length == 0) revert AddressIsNotAContract();
        
        membershipVerifier = IMembershipVerifier(_membershipVerifier);
        emit MembershipVerifierSet(_membershipVerifier);
    }

    /**
     * @dev Verifies a zk-SNARK proof for membership in a group.
     * It does not check for unique nullifiers or prevent double-spending. It can be used multiple times to prove membership of a user. 
     * @dev It can only be called by the contract owner (governor).
     * @custom:error RootNotYetInitialized If no root has been set for the group yet.
     * @custom:error InvalidMerkleRoot If the provided proof root does not match the current root.
     * @custom:error InvalidGroupKey If the group key in the public signals does not match the expected group key.
     * @custom:error InvalidProof If the provided zk-SNARK proof is invalid for the given group key.
     */
    function verifyMembership(
        uint256[24] calldata proof, 
        uint256[2] calldata publicSignals,
        bytes32 groupKey
    ) external onlyOwner nonZeroKey(groupKey) {

        bytes32 proofRoot = bytes32(publicSignals[0]);
        bytes32 proofGroupHash = bytes32(publicSignals[1]);

        // check if root is valid
        bytes32 currentRoot = groupRoots[groupKey];
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (currentRoot != proofRoot) revert InvalidMerkleRoot();

        // check if context is valid
        if (groupKey != proofGroupHash) revert InvalidGroupKey();

        // check if proof is valid
        bool isValid = membershipVerifier.verifyProof(proof, publicSignals);
        if (!isValid) revert InvalidProof(groupKey);

        // emit event
        emit ProofVerified(groupKey);
    }

    /**
     * @dev Uses the Clones library to create a deterministic clone of the NFT implementation.
     * @dev The newly deployed NFT Clone's owner is set to the MembershipManager.
     * @dev Only the governor can call this function. 
     * @custom:error GroupNftAlreadySet If an NFT contract has already been deployed for this group key.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     */
    function deployGroupNft(
        bytes32 groupKey,
        string calldata name, 
        string calldata symbol
    ) 
        external 
        onlyOwner 
        nonZeroKey(groupKey) 
        returns (address) 
    {
        if (groupNftAddresses[groupKey] != address(0)) revert GroupNftAlreadySet();
        if (bytes(symbol).length > 5 || bytes(symbol).length == 0) revert InvalidNftSymbolLength();
        if (bytes(name).length > 32 || bytes(name).length == 0) revert InvalidNftNameLength();

        bytes32 salt = groupKey;
        address clone = Clones.cloneDeterministic(
            nftImplementation, 
            salt // Use groupKey as the salt for deterministic deployment
        );

        // Update state first to mitigate re-entrancy risk
        groupNftAddresses[groupKey] = clone;
        emit GroupNftDeployed(groupKey, clone, name, symbol);
        
        IERC721IgnitionZK(clone).initialize(
            address(this), // DEFAULT_ADMIN_ROLE will be this contract
            address(this), // MINTER_ROLE will be this contract
            address(this), // BURNER_ROLE will be this contract
            name, 
            symbol
        );
        
        return clone;
    }

    /**
     * @dev Can only be called by the governor.
     * @custom:error RootCannotBeZero If the new root is zero.
     * @custom:error NewRootMustBeDifferent If the new root is identical to the current root.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     * @custom:error GroupNftNotSet If no NFT contract has been deployed for the specified group key.
     */
    function setRoot
    (   
        bytes32 newRoot, 
        bytes32 groupKey
    ) 
        external 
        onlyOwner
        nonZeroKey(groupKey) 
    {
        bytes32 currentRoot = groupRoots[groupKey];
        _mustHaveSetGroupNft(groupKey);

        if (newRoot == bytes32(0)) revert RootCannotBeZero();
        if (newRoot == currentRoot) revert NewRootMustBeDifferent();
        
        groupRoots[groupKey] = newRoot;
        if (currentRoot == bytes32(0)) {
            emit RootInitialized(groupKey, newRoot);
        } else {
            emit RootSet(groupKey, currentRoot, newRoot);
        }
    }

    /**
     * @dev Only the governor can call this function. Ensures that the member address is not zero, does not already hold a token for this group,
     * and is an externally owned account (EOA).
     * The function mints a new token for the member using the group's NFT contract.
     * Emits an event upon successful minting of the membership token.
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error AddressCannotBeZero If the member address is zero.
     * @custom:error MemberAlreadyHasToken If the member already holds a token for this group.
     * @custom:error MemberMustBeEOA If the member address is a contract address (and not an EOA).
     * @custom:error MintingFailed If the `safeMint` call to the NFT contract fails.
     */
    function mintNftToMember
    (
        address memberAddress, 
        bytes32 groupKey
    ) 
        public 
        onlyOwner 
        nonZeroKey(groupKey) 
        nonZeroAddress(memberAddress) 
    {
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
     * @dev Only the governor can call this function.
     * Iterates and calls `mintNftToMember` for each address.
     * Audit note: Consider a pull over push method for large batches to avoid gas limit issues.
     * @custom:error NoMembersProvided If the `memberAddresses` array is empty.
     * @custom:error MemberBatchTooLarge If the number of members exceeds `MAX_MEMBERS_BATCH`.
     * @custom:error (Propagates errors from `mintNftToMember`)
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     */
    function mintNftToMembers
    (
        address[] calldata memberAddresses, 
        bytes32 groupKey
    ) 
        public 
        onlyOwner 
        nonZeroKey(groupKey) 
    {
        uint256 memberCount = memberAddresses.length;
        if (memberCount == 0) revert NoMembersProvided();
        if (memberCount > MAX_MEMBERS_BATCH) revert MemberBatchTooLarge();

        for (uint256 i = 0; i < memberCount; i++) {
            mintNftToMember(memberAddresses[i], groupKey);
        }
    }

    /**
     * @dev Only the governor can call this function. Burns the membership token for the specified member.
     */
    function burnMemberNft
    (
        address memberAddress, 
        bytes32 groupKey
    ) 
        external 
        onlyOwner 
        nonZeroKey(groupKey) 
        nonZeroAddress(memberAddress) 
    {
        address groupNftAddress = _mustHaveSetGroupNft(groupKey);
        IERC721IgnitionZK nft = IERC721IgnitionZK(groupNftAddress);
        uint256 memberBalance = nft.balanceOf(memberAddress);
        if (memberBalance == 0) revert MemberDoesNotHaveToken();

        uint256 tokenIdToBurn = nft.tokenOfOwnerByIndex(memberAddress, 0);
        nft.revokeMembershipToken(tokenIdToBurn);
        emit MemberNftBurned(groupKey, memberAddress, tokenIdToBurn);
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
     * @dev Checks if the contract supports a specific interface.
     * @param interfaceId The interface identifier to check.
     * @return bool True if the interface is supported, false otherwise.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) 
    {
        return interfaceId == type(IMembershipManager).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view override(IVersioned, IMembershipManager) returns (string memory) {
        return "MembershipManager v1.0.0"; 
    }
       
// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Ensures that a group NFT is deployed for the specified group key.
     * @param groupKey The unique identifier for the group.
     * @return address of the ERC721 NFT contract associated with the specified group key.
     */
    function _mustHaveSetGroupNft(bytes32 groupKey) private view returns (address) {
        address nftAddress = groupNftAddresses[groupKey];
        if (nftAddress == address(0)) revert GroupNftNotSet();
        return nftAddress;
    }


}