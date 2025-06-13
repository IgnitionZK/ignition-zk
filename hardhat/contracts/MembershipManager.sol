// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IMembershipVerifier.sol";
import "./IERC721Mintable.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MembershipManager {

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
    error MintingFailed();
    // Proof errors:
    error InvalidProof();
    error NullifierAlreadyUsed();
    // Authorization errors:
    error OnlyRelayerAllowed();
    // Member errors:
    error MemberAddressCannotBeZero();
    error MemberAlreadyHasToken();
    error MemberBatchTooLarge();
    error NoMembersProvided();
    error MemberMustBeEOA();
    // General errors:
    error VerifierAddressCannotBeZero();
    error RelayerAddressCannotBeZero();
    error GovernorAddressCannotBeZero();
    error NewRelayerMustBeDifferent();

    // Events:
    event RootInitialized(bytes32 indexed groupKey, bytes32 root);
    event RootSet(bytes32 indexed groupKey, bytes32 oldRoot, bytes32 newRoot);
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed nullifier, bool isValid); 
    event GroupNftInitialized(bytes32 indexed groupKey, address nftAddress);
    event MemberAdded(bytes32 indexed groupKey, address memberAddress, uint256 tokenId);

    // Mappings:
    mapping(bytes32 => bytes32) public roots; // groupKey => Merkle root
    mapping(bytes32 => bool) public usedNullifiers; // nullifier => used status true/false
    mapping(bytes32 => address) public groupNftAddresses; // groupKey => NFT contract address
    mapping(bytes32 => uint256) public nextTokenIds; // groupKey => next token ID

    // State variables:
    IMembershipVerifier public immutable verifier;
    address public relayer;
    address public governor;

    // Constants:
    uint256 public constant MAX_MEMBERS_BATCH = 30;

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
        _;
    }

    modifier onlyGovernor() {
        if (msg.sender != governor) revert OnlyGovernorAllowed();
        _;
    }

    constructor(
        address _verfifier, 
        address _governor
        ) {

        if (_verifier == address(0)) revert VerifierAddressCannotBeZero();
        if (_governor == address(0)) revert GovernorAddressCannotBeZero();

        governor = _governor;
        verifier = IMembershipVerifier(_verifier);
    }

    function setRelayer(address _relayer) external onlyGovernance() {

        if (_relayer == address(0)) revert RelayerAddressCannotBeZero();
        if (_relayer == relayer) revert NewRelayerMustBeDifferent();

        relayer = _relayer;
    }

    function initRoot(bytes32 initialRoot, bytes32 groupKey) external onlyRelayer {

        bytes32 currentRoot = roots[groupKey];

        if (currentRoot != bytes32(0)) revert RootAlreadyInitialized();
        if (initialRoot == bytes32(0)) revert RootCannotBeZero();

        roots[groupKey] = initialRoot;
        nextTokenIds[groupKey] = 1; 
        emit RootInitialized(groupKey, initialRoot);
    }
 
    function setRoot(bytes32 newRoot, bytes32 groupKey) external onlyRelayer {

        bytes32 currentRoot = roots[groupKey];

        // checks:
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (newRoot == bytes32(0)) revert RootCannotBeZero();
        if (newRoot == currentRoot) revert NewRootMustBeDifferent();
        
        // effects:
        roots[groupKey] = newRoot;
        emit RootSet(groupKey, currentRoot, newRoot);
    }

    function verifyProof(
        uint256[24] calldata proof, 
        uint256[2] calldata publicSignals,
        bytes32 groupKey
        ) external onlyRelayer {

        bytes32 proofRoot = bytes32(publicSignals[1]);
        bytes32 nullifier = bytes32(publicSignals[0]);
        bytes32 currentRoot = roots[groupKey];

        // checks:
        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (currentRoot != proofRoot) revert InvalidMerkleRoot();
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        // interactions:
        bool isValid = verifier.verifyProof(proof, publicSignals);
        if (!isValid) revert InvalidProof();

        // effects: 
        usedNullifiers[nullifier] = true;

        emit ProofVerified(groupKey, nullifier, isValid);
    }

    function initGroupNft(
        bytes32 groupKey, 
        address nftAddress
        ) external onlyGovernor() {

        // checks:
        if (nftAddress == address(0)) revert NftAddressCannotBeZero();
        if (!IERC165(nftAddress).supportsInterface(type(IERC721).interfaceId)) revert NftMustBeERC721();
        if (groupNftAddresses[groupKey] != address(0)) revert GroupNftAlreadySet();

        // effects:
        groupNftAddresses[groupKey] = nftAddress;
        emit GroupNftInitialized(groupKey, nftAddress);
    }

    function addMember(
        address memberAddress, 
        bytes32 groupKey
        ) public onlyGovernor() {
        
        address groupNftAddress = groupNftAddresses[groupKey];
        IERC721Mintable nft = IERC721Mintable(groupNftAddress);  
        uint256 memberBalance = nft.balanceOf(memberAddress);
        uint256 tokenId = nextTokenIds[groupKey];

        // checks:
        if (memberAddress == address(0)) revert MemberAddressCannotBeZero();
        if (groupNftAddress == address(0)) revert GroupNftNotSet();
        if (memberBalance > 0) revert MemberAlreadyHasToken();
        if (memberAddress.code.length != 0) revert MemberMustBeEOA();
    
        // interactions:
        try nft.mint(memberAddress, tokenId) {
            // effects:
            nextTokenIds[groupKey]++;
            emit MemberAdded(groupKey, memberAddress, tokenId);
        } catch {
            revert MintingFailed();
        }
    }

    function addMembers(
        address[] calldata memberAddresses, 
        bytes32 groupKey
        ) public onlyGovernor() {
        
        uint256 memberCount = memberAddresses.length;

        // checks:
        if (memberCount == 0) revert NoMembersProvided();
        if (memberCount > MAX_MEMBERS_BATCH) revert MemberBatchTooLarge();

        for (uint256 i = 0; i < memberCount; i++) {
            addMember(memberAddresses[i], groupKey);
        }
    }
}