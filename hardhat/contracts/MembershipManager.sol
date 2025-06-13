// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IMembershipVerifier.sol";
import "./IERC721Mintable.sol";

contract MembershipManager {

    IMembershipVerifier public immutable verifier;

    bytes32 public currentRoot;
    address public relayer;
    uint256 public nextTokenId;
    mapping(bytes32 => bool) public usedNullifiers;
    mapping(bytes32 => address) public groupNftAddresses;
    //mapping(bytes32 => IERC721Mintable) private _groupNftInterfaces;

    error RootCannotBeZero();
    error InvalidMerkleRoot();
    error NewRootMustBeDifferent();
    error NullifierAlreadyUsed();
    error VerifierAddressCannotBeZero();
    error OnlyRelayerAllowed();
    error MemberAddressCannotBeZero();
    error MemberAlreadyHasToken();
    error GroupNftNotSet();
 
    event RootUpdated(bytes32 newRoot);
    event ProofVerified(bytes32 nullifier, bool isValid);
    event GroupNftSet(bytes32 indexed groupKey, string groupName, address nftAddress);
    event MemberAdded(address memberAddress, uint256 tokenId);

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
        _;
    }

    constructor(
        bytes32 initialRoot, 
        address verifierAddress, 
        address relayerAddress
        ) {

        if (initialRoot == bytes32(0)) revert RootCannotBeZero();
        if (verifierAddress == address(0)) revert VerifierAddressCannotBeZero();
        
        currentRoot = initialRoot;
        nextTokenId = 1;
        verifier = IMembershipVerifier(verifierAddress);
        relayer = relayerAddress;
    }

    function _getGroupKey(string memory name) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(name));
    }

    function updateRoot(bytes32 newRoot) external onlyRelayer {

        if (newRoot == bytes32(0)) revert RootCannotBeZero();
        if (newRoot == currentRoot) revert NewRootMustBeDifferent();
        
        currentRoot = newRoot;
        emit RootUpdated(newRoot);
    }

    function verifyProof(uint256[24] calldata proof, uint256[2] calldata publicSignals) external onlyRelayer returns (bool) {

        bytes32 proofRoot = bytes32(publicSignals[1]);
        bytes32 nullifier = bytes32(publicSignals[0]);

        // checks:
        if (currentRoot != proofRoot) revert InvalidMerkleRoot();
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        // effects:
        usedNullifiers[nullifier] = true;

        // interactions:
        bool isValid = verifier.verifyProof(proof, publicSignals);

        emit ProofVerified(nullifier, isValid);
        return isValid;
    }

    function setGroupNft(string calldata groupName, address nftAddress) external onlyRelayer {
        bytes32 groupKey = _getGroupKey(groupName);
        groupNftAddresses[groupKey] = nftAddress;
        emit GroupNftSet(groupKey, groupName, nftAddress);
    }

    function addMember(address memberAddress, string calldata groupName) public onlyRelayer {
        
        bytes32 groupKey = _getGroupKey(groupName);
        address groupNftAddress = groupNftAddresses[groupKey];

        // checks:
        if (memberAddress == address(0)) revert MemberAddressCannotBeZero();
        if (groupNftAddress == address(0)) revert GroupNftNotSet();
        
        IERC721Mintable nft = IERC721Mintable(groupNftAddress);  
        uint256 memberBalance = nft.balanceOf(memberAddress);
        if (memberBalance > 0) revert MemberAlreadyHasToken();

        // effects:
        uint256 tokenId = nextTokenId;
        nextTokenId++;

        // interactions:
        nft.safeMint(memberAddress, tokenId);
        emit MemberAdded(memberAddress, tokenId);
    }

    function addMembers(address[] calldata memberAddresses, string calldata groupName) external onlyRelayer() {
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            addMember(memberAddresses[i], groupName);
        }
    }

}