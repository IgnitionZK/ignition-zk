// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMembershipManager {
    // Events
    event RootInitialized(bytes32 indexed groupKey, bytes32 root);
    event RootSet(bytes32 indexed groupKey, bytes32 oldRoot, bytes32 newRoot);
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed nullifier);
    event GroupNftDeployed(bytes32 indexed groupKey, address indexed nftAddress, string name, string symbol);
    event MemberNftMinted(bytes32 indexed groupKey, address indexed memberAddress, uint256 tokenId);
    event MemberNftBurned(bytes32 indexed groupKey, address indexed memberAddress, uint256 tokenId);

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
    error MintingFailed(string reason);
    error InvalidProof(bytes32 groupKey, bytes32 nullifier);
    error NullifierAlreadyUsed();
    error MemberAddressCannotBeZero();
    error MemberAlreadyHasToken();
    error MemberDoesNotHaveToken();
    error MemberBatchTooLarge();
    error NoMembersProvided();
    error MemberMustBeEOA();
    error VerifierAddressCannotBeZero();
    error GovernorAddressCannotBeZero();
    error KeyCannotBeZero();

    // Functions
    function initRoot(bytes32 initialRoot, bytes32 groupKey) external;
    function setRoot(bytes32 newRoot, bytes32 groupKey) external;
    function getRoot(bytes32 groupKey) external view returns (bytes32);
    function verifyProof(uint256[24] calldata proof, uint256[3] calldata publicSignals, bytes32 groupKey) external;
    function deployGroupNft(bytes32 groupKey, string calldata name, string calldata symbol) external returns (address);
    function getGroupNftAddress(bytes32 groupKey) external view returns (address);
    function getNullifierStatus(bytes32 groupKey, bytes32 nullifier) external view returns (bool);
    function getVerifier() external view returns (address);
    function getGovernor() external view returns (address);
    function getNftImplementation() external view returns (address);
    function getMaxMembersBatch() external view returns (uint256);
    function mintNftToMember(address memberAddress, bytes32 groupKey) external;
    function mintNftToMembers(address[] calldata memberAddresses, bytes32 groupKey) external;
    function burnMemberNft(address memberAddress, bytes32 groupKey) external;
    function revokeMinterRole(address nftClone) external;
    function revokeBurnerRole(address nftClone) external;
    function grantMinterRole(address nftClone, address grantTo) external;
    function grantBurnerRole(address nftClone, address grantTo) external;

    // state variables
    function groupRoots(bytes32 groupKey) external view returns (bytes32);
}