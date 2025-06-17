// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMembershipManager {
    // Events
    event RootInitialized(bytes32 indexed groupKey, bytes32 root);
    event RootSet(bytes32 indexed groupKey, bytes32 oldRoot, bytes32 newRoot);
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed nullifier, bool isValid);
    event GroupNftDeployed(bytes32 indexed groupKey, address indexed nftAddress, string name, string symbol);
    event MemberAdded(bytes32 indexed groupKey, address indexed memberAddress, uint256 tokenId);
    event MemberRemoved(bytes32 indexed groupKey, address indexed memberAddress, uint256 tokenId);

    // Custom errors
    error RootCannotBeZero();
    error InvalidMerkleRoot();
    error NewRootMustBeDifferent();
    error RootNotYetInitialized();
    error RootAlreadyInitialized();
    error GroupNftNotSet();
    error GroupNftAlreadySet();
    error NftAddressCannotBeZero();
    error NftMustBeERC721();
    error MintingFailed();
    error InvalidProof();
    error NullifierAlreadyUsed();
    error MemberAddressCannotBeZero();
    error MemberAlreadyHasToken();
    error MemberDoesNotHaveToken();
    error MemberHasMultipleTokens();
    error MemberBatchTooLarge();
    error NoMembersProvided();
    error MemberMustBeEOA();
    error VerifierAddressCannotBeZero();
    error GovernorAddressCannotBeZero();

    // Functions
    function initRoot(bytes32 initialRoot, bytes32 groupKey) external;
    function setRoot(bytes32 newRoot, bytes32 groupKey) external;
    function getRoot(bytes32 groupKey) external view returns (bytes32);
    function verifyProof(uint256[24] calldata proof, uint256[2] calldata publicSignals, bytes32 groupKey) external;
    function deployGroupNft(bytes32 groupKey, string calldata name, string calldata symbol) external returns (address);
    function addMember(address memberAddress, bytes32 groupKey) external;
    function addMembers(address[] calldata memberAddresses, bytes32 groupKey) external;
    function removeMember(address memberAddress, bytes32 groupKey) external;
}