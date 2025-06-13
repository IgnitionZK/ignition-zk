// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IMembershipVerifier.sol";
import "./IERC721Mintable.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MembershipManager {

    IMembershipVerifier public immutable verifier;

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
    // General errors:
    error VerifierAddressCannotBeZero();
    error RelayerAddressCannotBeZero();

    // Events:
    event RootInitialized(bytes32 indexed groupKey, bytes32 root);
    event RootSet(bytes32 indexed groupKey, bytes32 oldRoot, bytes32 newRoot);
    event ProofVerified(bytes32 indexed groupKey, bytes32 indexed nullifier);
    event GroupNftSet(bytes32 indexed groupKey, address nftAddress);
    event MemberAdded(bytes32 indexed groupKey, address memberAddress, uint256 tokenId);

    // Mappings:
    mapping(bytes32 => bytes32) public roots; // groupKey => Merkle root
    mapping(bytes32 => bool) public usedNullifiers; // nullifier => used status true/false
    mapping(bytes32 => address) public groupNftAddresses; // groupKey => NFT contract address
    mapping(bytes32 => uint256) public nextTokenIds; // groupKey => next token ID

    // State variables:
    address public relayer;
    uint256 public constant MAX_MEMBERS_BATCH = 30;

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
        _;
    }

    constructor(
        address verifierAddress, 
        address relayerAddress
        ) {

        if (verifierAddress == address(0)) revert VerifierAddressCannotBeZero();
        if (relayerAddress == address(0)) revert RelayerAddressCannotBeZero();
        
        verifier = IMembershipVerifier(verifierAddress);
        relayer = relayerAddress;
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

        if (currentRoot == bytes32(0)) revert RootNotYetInitialized();
        if (newRoot == bytes32(0)) revert RootCannotBeZero();
        if (newRoot == currentRoot) revert NewRootMustBeDifferent();
        
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

        emit ProofVerified(groupKey, nullifier);
    }

    function setGroupNft(
        bytes32 groupKey, 
        address nftAddress
        ) external onlyRelayer {

        // checks:
        if (!IERC165(nftAddress).supportsInterface(0x80ac58cd) == false) revert NftMustBeERC721();
        if (groupNftAddresses[groupKey] != address(0)) revert GroupNftAlreadySet();
        if (nftAddress == address(0)) revert NftAddressCannotBeZero();

        // effects:
        groupNftAddresses[groupKey] = nftAddress;
        emit GroupNftSet(groupKey, nftAddress);
    }

    function addMember(
        address memberAddress, 
        bytes32 groupKey
        ) public onlyRelayer {
        
        address groupNftAddress = groupNftAddresses[groupKey];
        IERC721Mintable nft = IERC721Mintable(groupNftAddress);  
        uint256 memberBalance = nft.balanceOf(memberAddress);
        uint256 tokenId = nextTokenIds[groupKey];

        // checks:
        if (memberAddress == address(0)) revert MemberAddressCannotBeZero();
        if (groupNftAddress == address(0)) revert GroupNftNotSet();
        if (memberBalance > 0) revert MemberAlreadyHasToken();
    
        try {
            // interactions:
            nft.safeMint(memberAddress, tokenId);

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
        ) public onlyRelayer() {
        
        uint256 memberCount = memberAddresses.length;

        // checks:
        if (memberCount == 0) revert NoMembersProvided();
        if (memberCount > MAX_MEMBERS_BATCH) revert MemberBatchTooLarge();

        for (uint256 i = 0; i < memberCount; i++) {
            addMember(memberAddresses[i], groupKey);
        }
    }

    //function _getGroupKey(string memory groupId) private pure returns (bytes32) {
    //    return keccak256(abi.encodePacked(groupId));
    //}

}