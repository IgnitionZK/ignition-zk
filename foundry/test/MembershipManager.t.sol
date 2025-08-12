// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "forge-std/console.sol";

// OZ Imports:
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Contracts:
import { MembershipManager } from "hardhat-contracts/managers/MembershipManager.sol";
import { ProposalManager } from "hardhat-contracts/managers/ProposalManager.sol";
import { ERC721IgnitionZK } from "hardhat-contracts/token/ERC721IgnitionZK.sol";

// Verifiers:
import { MockProposalVerifier } from "hardhat-contracts/mocks/MockProposalVerifier.sol";
import { MockProposalClaimVerifier } from "hardhat-contracts/mocks/MockProposalClaimVerifier.sol";
import { MembershipVerifier } from "hardhat-contracts/verifiers/MembershipVerifier.sol";

// Interfaces: 
import { IMembershipManager } from "hardhat-contracts/interfaces/managers/IMembershipManager.sol";
import { IProposalManager } from "hardhat-contracts/interfaces/managers/IProposalManager.sol";
import { IMembershipManager } from "hardhat-contracts/interfaces/managers/IMembershipManager.sol";
import { IProposalVerifier } from "hardhat-contracts/interfaces/verifiers/IProposalVerifier.sol";


contract MembershipManagerTest is Test {
    MembershipManager membershipManager;
    MembershipVerifier membershipVerifier;
    ERC721IgnitionZK nftImplementation;

    address governor = vm.addr(1);
    address mockMember = vm.addr(2);
    string mockNftName = "IgnitionZK Membership NFT";
    string mockNftSymbol = "IZK";
    bytes32 mockGroupKey = keccak256(abi.encodePacked("mockGroupKey"));
    bytes32 mockRootHash = keccak256(abi.encodePacked("mockRootHash"));
    bytes32 mockRootHashNew = keccak256(abi.encodePacked("mockRootHashNew"));

    function setUp() public {
        // deploy the NFT implementation contract
        nftImplementation = new ERC721IgnitionZK();

        // deploy the MembershipManager implementation contract
        MembershipManager membershipManagerImpl = new MembershipManager();

        // deploy the MembershipVerifier contract
        membershipVerifier = new MembershipVerifier();

        // prepare the MembershipManager initialization data
        bytes memory initData = abi.encodeWithSelector(
            MembershipManager.initialize.selector,
            governor,
            address(nftImplementation),
            address(membershipVerifier)
        );
    	
        // deploy the MembershipManager UUPS proxy contract
        ERC1967Proxy membershipManagerProxy = new ERC1967Proxy(
            address(membershipManagerImpl),
            initData
        );

        // cast the proxy to MembershipManager interface
        membershipManager = MembershipManager(address(membershipManagerProxy));
    }


    /**
     * @dev Fuzz test: tests deployment of group NFTs with various group keys
     * Assumes the group key is not zero.
     */
    function testFuzz_deployGroupNft_SucceeedsWithAnyFuzzedGroupKey(bytes32 groupKey) public {
        vm.assume(groupKey != bytes32(0));
        vm.startPrank(governor);

        // use Clones to predict the address of the clone
        address expectedCloneAddress = _expectedCloneAddress(groupKey);

        // check the emitted event
        vm.expectEmit(true, true, true, true);
        emit MembershipManager.GroupNftDeployed(groupKey, expectedCloneAddress, mockNftName, mockNftSymbol);

        // deploy the group NFT with the group key fuzz inputs
        membershipManager.deployGroupNft(
            groupKey,
            mockNftName,
            mockNftSymbol
        );

        // verify that the clone was deployed at the expected address
        address cloneAddress = membershipManager.getGroupNftAddress(groupKey);
        assertEq(cloneAddress, expectedCloneAddress, "Clone address does not match the expected address");

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: tests deployment of group NFTs with various NFT symbols
     * Assumes the NFT symbol is within the valid length range (1-5 characters).
     */
    function testFuzz_deployGroupNft__SucceedsWithFuzzedNftSymbol(string memory fuzzNftSymbol) public {
        vm.startPrank(governor);

        // ensure the fuzzed symbol is within the valid length range
        uint256 symbolLength = bytes(fuzzNftSymbol).length;
        vm.assume(symbolLength > 0 && symbolLength <= 5); 

        address expectedCloneAddress = _expectedCloneAddress(mockGroupKey);

        // check the emitted event
        vm.expectEmit(true, true, true, true);
        emit MembershipManager.GroupNftDeployed(mockGroupKey, expectedCloneAddress, mockNftName, fuzzNftSymbol);

        // deploy the group NFT with the group key fuzz inputs
        membershipManager.deployGroupNft(
            mockGroupKey,
            mockNftName,
            fuzzNftSymbol
        );

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: tests deployment of group NFTs with various NFT names.
     * Assumes the NFT name is within the valid length range (1-32 characters).
     */
    function testFuzz_deployGroupNft_SucceedsWithValidFuzzedNftName(string memory fuzzNftName) public {
        vm.startPrank(governor);
        
        // ensure the fuzzed name is within the valid length range
        uint256 nameLength = bytes(fuzzNftName).length;
        vm.assume(nameLength > 0 && nameLength <= 32);

        address expectedCloneAddress = _expectedCloneAddress(mockGroupKey);

        // check the emitted event
        vm.expectEmit(true, true, true, true);
        emit MembershipManager.GroupNftDeployed(mockGroupKey, expectedCloneAddress, fuzzNftName, mockNftSymbol);

        // deploy the group NFT with the group key fuzz inputs
        membershipManager.deployGroupNft(
            mockGroupKey,
            fuzzNftName,
            mockNftSymbol
        );

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: tests setting a new root for a group with various group keys.
     * Assumes the group key is not zero.
     */
    function testFuzz_setRoot_SucceedsWithValidFuzzedGroupKey(bytes32 groupKey) public {
        vm.assume(groupKey != bytes32(0));
        vm.startPrank(governor);

        // deploy the group NFT first
        membershipManager.deployGroupNft(
            groupKey,
            mockNftName,
            mockNftSymbol
        );

        // initialize the root for the group
        // check the emitted event for setting the root
        vm.expectEmit(true, true, false, false);
        emit MembershipManager.RootInitialized(groupKey, mockRootHash);
        membershipManager.setRoot(mockRootHash, groupKey);

        // check the emitted event for setting the root
        vm.expectEmit(true, true, true, false);
        emit MembershipManager.RootSet(groupKey, mockRootHash, mockRootHashNew);
        // set the new root for the group
        membershipManager.setRoot(mockRootHashNew, groupKey);

        bytes32 actualRoot = membershipManager.getRoot(groupKey);
        assertEq(actualRoot, mockRootHashNew, "Root does not match the expected value");

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: tests setting a new root for a group with various new roots.
     * Assumes the new root is not zero.
     */
    function testFuzz_setRoot_SucceedsWithValidFuzzedNewRoot(bytes32 newRoot) public {
        vm.assume(newRoot != bytes32(0));
        vm.startPrank(governor);

        // deploy the group NFT first
        membershipManager.deployGroupNft(
            mockGroupKey,
            mockNftName,
            mockNftSymbol
        );
        
        // initialize the root for the group
        membershipManager.setRoot(mockRootHash, mockGroupKey);

        // check the emitted event for setting the root
        vm.expectEmit(true, true, true, false);
        emit MembershipManager.RootSet(mockGroupKey, mockRootHash, newRoot);
        // set the new root for the group
        membershipManager.setRoot(newRoot, mockGroupKey);

        bytes32 actualRoot = membershipManager.getRoot(mockGroupKey);
        assertEq(actualRoot, newRoot, "Root does not match the expected value");

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: tests minting NFTs to members with various member addresses.
     * Assumes the member address is not zero and is an EOA.
     */
    function testFuzz_mintNftToMember_SucceedsWithValidFuzzedMemberAddress(address member) public {
        vm.assume(member != address(0));
        vm.assume(member.code.length == 0); 
        vm.startPrank(governor);
        
        // deploy Group VFT
        membershipManager.deployGroupNft(
            mockGroupKey,
            mockNftName,
            mockNftSymbol
        );

        vm.expectEmit(true, true, true, false);
        emit MembershipManager.MemberNftMinted(mockGroupKey, member, uint256(0));

        // mint NFT to the member
        membershipManager.mintNftToMember(
            member,
            mockGroupKey
        );

    }

    /**
     * @dev Fuzz test: tests minting NFTs to a member using various group keys.
     * Assumes the member address is not zero and is an EOA.
     */
    function testFuzz_mintNftToMember_SucceedsWithValidFuzzedGroupKey(bytes32 groupKey) public {
        vm.assume(groupKey != bytes32(0));
        vm.startPrank(governor);
        
        // deploy Group VFT
        membershipManager.deployGroupNft(
            groupKey,
            mockNftName,
            mockNftSymbol
        );

        vm.expectEmit(true, true, true, false);
        emit MembershipManager.MemberNftMinted(groupKey, mockMember, uint256(0));

        // mint NFT to the member
        membershipManager.mintNftToMember(
            mockMember,
            groupKey
        );

    }

    /**
     * @dev Helper function to predict the address of the clone NFT contract
     */
    function _expectedCloneAddress(bytes32 groupKey) private view returns (address) {
        return Clones.predictDeterministicAddress(
            address(nftImplementation), 
            groupKey, 
            address(membershipManager)
        );
    }
    


}