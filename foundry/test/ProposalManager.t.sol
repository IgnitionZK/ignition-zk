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

/**
 * @notice Fuzz Tests for ProposalManager
 * @dev We only use Foundry for Fuzz testing the relevant functions. 
 * The rest of the unit tests can be found in the hardhat test suite.
 */
contract ProposalManagerTest is Test {
    MockProposalVerifier private mockProposalVerifier;
    MockProposalClaimVerifier private mockProposalClaimVerifier;
    ProposalManager private proposalManager;
    MembershipManager private membershipManager;
    MembershipVerifier private membershipVerifier;
    ERC721IgnitionZK private nftImplementation; 

    // Mock owner
    address governor = vm.addr(1);

    // Mock ERC721 token name and symbol
    string nftName = "Test Group NFT";
    string nftSymbol = "TGNFT";
    
    // Mock proof data
    bytes32 validGroupKey = keccak256(abi.encodePacked("groupKey"));
    bytes32 validContextHash = keccak256(abi.encodePacked("contextKey"));
    bytes32 validSubmissionNullifier = keccak256(abi.encodePacked("proposalNullifier"));
    bytes32 validClaimNullifier = keccak256(abi.encodePacked("claimNullifier"));
    bytes32 validCurrentRoot = keccak256(abi.encodePacked("currentRoot"));
    bytes32 validContentHash = keccak256(abi.encodePacked("contentHash"));

    // Mock proof
    uint256[24] private proof = [
            uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10, 
            11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
            21, 22, 23, 24
        ];

    // Public signals for the proposal verification
    uint256[5] private publicSignals = [
            uint256(validContextHash), 
            uint256(validSubmissionNullifier), 
            uint256(validClaimNullifier),
            uint256(validCurrentRoot),
            uint256(validContentHash)
        ];

    // Public signals for the proposal claim verification
    uint256[3] private publicSignalsClaim = [
            uint256(validClaimNullifier),
            uint256(validSubmissionNullifier), 
            uint256(validContextHash)
        ];

    function setUp() public {
        // deploy the mock verifiers
        mockProposalVerifier = new MockProposalVerifier();
        mockProposalClaimVerifier = new MockProposalClaimVerifier();

        // deploy the NFT implementation contract
        nftImplementation = new ERC721IgnitionZK();

        // deploy the ProposalManager and MembershipManager implementation contracts
        ProposalManager proposalManagerImpl = new ProposalManager();
        MembershipManager membershipManagerImpl = new MembershipManager();
        MembershipVerifier membershipVerifier = new MembershipVerifier();
      

        // prepare the calldata for MembershipManager initializer
        bytes memory initDataMembershipManager = abi.encodeWithSelector(
            MembershipManager.initialize.selector,
            governor, 
            address(nftImplementation),
            address(membershipVerifier)
        );

        // deploy proxy pointing to the implementation contract
        // and initialize it with the provided calldata
        ERC1967Proxy proxyMembershipManager = new ERC1967Proxy(
            address(membershipManagerImpl), 
            initDataMembershipManager
        );

        // cast the proxy to MembershipManager interface
        membershipManager = MembershipManager(address(proxyMembershipManager));

        // prepare the calldata for ProposalManager initializer
        bytes memory initDataProposalManager = abi.encodeWithSelector(
            ProposalManager.initialize.selector,
            governor, 
            address(mockProposalVerifier),
            address(mockProposalClaimVerifier),
            address(membershipManager)
        );

        // deploy proxy pointing to the implementation contract
        ERC1967Proxy proxyProposalManager = new ERC1967Proxy(
            address(proposalManagerImpl), 
            initDataProposalManager
        );

        // cast the proxy to ProposalManager interface
        proposalManager = ProposalManager(address(proxyProposalManager));
    }
    
    // =====================================================================================================================
    //                                     TESTS: setProposalSubmissionVerifier
    // =====================================================================================================================

    /** 
     * @dev Fuzz test: tests that the proposal submission verifier cannot be set to a non-contract address.
     * It assumes the address is not zero and does not have any code.
     */
    function testFuzz_setProposalSubmissionVerifier_RevertsIfAddressIsNotAContract(address submissionVerifier) public {
        vm.startPrank(governor);
        vm.assume(submissionVerifier != address(0));
        vm.assume(submissionVerifier.code.length == 0);
        
        vm.expectRevert(ProposalManager.AddressIsNotAContract.selector);
        proposalManager.setProposalSubmissionVerifier(submissionVerifier);
        
        vm.stopPrank();
    }

    // =====================================================================================================================
    //                                     TESTS: setProposalClaimVerifier
    // =====================================================================================================================

    /** 
     * @dev Fuzz test: tests that the proposal claim verifier cannot be set to a non-contract address.
     * It assumes the address is not zero and does not have any code.
     */
    function testFuzz_setProposalClaimVerifier_RevertsIfAddressIsNotAContract(address claimVerifier) public {
        vm.startPrank(governor);
        vm.assume(claimVerifier != address(0));
        vm.assume(claimVerifier.code.length == 0);

        vm.expectRevert(ProposalManager.AddressIsNotAContract.selector);
        proposalManager.setProposalClaimVerifier(claimVerifier);

        vm.stopPrank();
    }

    // =====================================================================================================================
    //                                     TESTS: verifyProposal
    // =====================================================================================================================

    /**
     * @dev Fuzz test: tests that the verifyProposal function reverts when the context key is invalid.
     * It assumes the context key is not zero and does not match the valid context hash.
     */ 
    function testFuzz_verifyProposal_RevertsWhenContextKeyIsInvalid(bytes32 contextKey) public {
        vm.startPrank(governor);
        vm.assume(contextKey != bytes32(0));
        vm.assume(contextKey != validContextHash);

        _deployGroupNftAndSetRoot();
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));
        
        vm.expectRevert(ProposalManager.InvalidContextHash.selector);
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            contextKey,
            validGroupKey
        );
        vm.stopPrank();
    }

    // =====================================================================================================================
    //                                     TESTS: verifyProposalClaim
    // =====================================================================================================================

    /**
     * @dev Fuzz test: tests that the verifyProposalClaim function reverts when the proposal has not been submitted.
     * It assumes the context key is not zero.
     */
    function testFuzz_verifyProposalClaim_RevertsWhenProposalHasNotBeenSubmitted(bytes32 contextKey) public {
        vm.startPrank(governor);
        vm.assume(contextKey != bytes32(0));
        proposalManager.setProposalClaimVerifier(address(mockProposalClaimVerifier));
        
        vm.expectRevert(ProposalManager.ProposalHasNotBeenSubmitted.selector);
        proposalManager.verifyProposalClaim(
            proof,
            publicSignalsClaim,
            contextKey
        );
        vm.stopPrank();
    }

    /**
     * @dev Helper Function: Deploys the group NFT and sets the Merkle root.
     */
    function _deployGroupNftAndSetRoot() private {
        // 1. Deploy group NFT
        membershipManager.deployGroupNft(
            validGroupKey,
            nftName,
            nftSymbol
        );
        
        // 2. Set the root for the group
        membershipManager.setRoot(validCurrentRoot, validGroupKey);
    }

}