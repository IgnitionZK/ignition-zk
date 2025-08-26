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

contract Dummy {
    function dummyFunction() external pure returns (string memory) {
        return "Dummy Function";
    }
}

contract ProposalManagerTest is Test {
    MockProposalVerifier private mockProposalVerifier;
    MockProposalClaimVerifier private mockProposalClaimVerifier;
    ProposalManager private proposalManager;
    MembershipManager private membershipManager;
    MembershipVerifier private membershipVerifier;
    ERC721IgnitionZK private nftImplementation; 
    Dummy private dummy;

    address governor = vm.addr(1);

    string nftName = "Test Group NFT";
    string nftSymbol = "TGNFT";
    
    bytes32 validContextHash = keccak256(abi.encodePacked("contextKey"));
    bytes32 validSubmissionNullifier = keccak256(abi.encodePacked("proposalNullifier"));
    bytes32 validClaimNullifier = keccak256(abi.encodePacked("claimNullifier"));
    bytes32 validCurrentRoot = keccak256(abi.encodePacked("currentRoot"));
    bytes32 validContentHash = keccak256(abi.encodePacked("contentHash"));

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

        // deploy the dummy contract
        dummy = new Dummy();

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

    
    /**
     * @dev Tests that the proposal submission verifier cannot be set to an address that does not support the required interface.
     */
    /*
    function test_setProposalSubmissionVerifier_RevertsIfAddressDoesNotSupportInterface() public {
        vm.startPrank(governor);
        vm.expectRevert(ProposalManager.AddressDoesNotSupportInterface.selector);
        proposalManager.setProposalSubmissionVerifier(address(dummy));
        vm.stopPrank();
    }
    */

    /**
     * @dev Checks that the proposal submission verifier can be set to a valid contract address.
     * It assumes the address is not zero and supports the IProposalVerifier interface.
     */
    /*
    function test_setProposalSubmissionVerifier_SucceedsWithValidAddress() public {
        vm.startPrank(governor);
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));
        assertEq(proposalManager.getProposalSubmissionVerifier(), address(mockProposalVerifier));
        vm.stopPrank();
    }
    */

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
     /*
    function testFuzz_verifyProposal_RevertsWhenContextKeyIsInvalid(bytes32 contextKey) public {
        vm.startPrank(governor);
        vm.assume(contextKey != bytes32(0));
        vm.assume(contextKey != validContextHash);
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));
        
        vm.expectRevert(ProposalManager.InvalidContextHash.selector);
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            contextKey,
            groupKey
        );
        vm.stopPrank();
    }
    */

    /**
     * @dev Tests that the verifyProposal function succeeds when the context key is valid.
     */
    /*
    function test_verifyProposal_SucceedsWhenContextKeyIsValid() public {
        vm.startPrank(governor);
        
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));
        
        vm.expectEmit(true, true, true, true);
        emit ProposalManager.SubmissionVerified(validContextHash, validSubmissionNullifier, validClaimNullifier, validContentHash);
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            validContextHash,
            validCurrentRoot
        );
        vm.stopPrank();
    }
    */

    /**
     * @dev Fuzz test: tests that the verifyProposal function reverts when the currentRoot is invalid.
     * It assumes the currentRoot is not equal to the valid root.
     */
     /*
    function testFuzz_verifyProposal_RevertsWhenMerkleRootIsInvalid(bytes32 root) public {
        vm.startPrank(governor);
        vm.assume(root != validCurrentRoot);
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));
        
        vm.expectRevert(ProposalManager.InvalidMerkleRoot.selector);
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            validContextHash,
            root
        );
        vm.stopPrank();
    }
    */

    /**
     * @dev Tests that the verifyProposal function succeeds when the context key is valid.
     */
    /*
    function test_verifyProposal_SucceedsWhenMerkleRootIsValid() public {
        vm.startPrank(governor);
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));
        
        vm.expectEmit(true, true, true, true);
        emit ProposalManager.SubmissionVerified(validContextHash, validSubmissionNullifier, validClaimNullifier, validContentHash);
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            validContextHash,
            validCurrentRoot
        );
        vm.stopPrank();
    }
    */

    /**
    * @dev Tests that the verifyProposal function fails when the current root is zero.
     */
    /*
    function test_verifyProposal_FailsWhenCurrentRootIsZero() public {
        vm.startPrank(governor);
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));

        uint256[5] memory currPublicSignals = [
            uint256(keccak256(abi.encodePacked("contextKey"))), 
            uint256(keccak256(abi.encodePacked("proposalNullifier"))), 
            uint256(keccak256(abi.encodePacked("claimNullifier"))),
            uint256(0), // currentRoot is zero
            uint256(keccak256(abi.encodePacked("contentHash")))
        ];
        
        vm.expectRevert(ProposalManager.RootNotYetInitialized.selector);
        proposalManager.verifyProposal(
            proof,
            currPublicSignals,
            validContextHash,
            bytes32(0)
        );
        vm.stopPrank();
    }
    */

    /**
     * @dev Tests that the verifyProposal function fails when the submission nullifier has already been used.
     */
    /*
    function test_verifyProposal_FailsWhenSubmissionNullifierIsUsed() public {
        vm.startPrank(governor);
        proposalManager.setProposalSubmissionVerifier(address(mockProposalVerifier));

        proposalManager.verifyProposal(
            proof,
            publicSignals,
            validContextHash,
            validCurrentRoot
        );

        vm.expectRevert(ProposalManager.SubmissionNullifierAlreadyUsed.selector);
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            validContextHash,
            validCurrentRoot
        );
        vm.stopPrank();
    }
    */
    // =====================================================================================================================
    //                                     TESTS: verifyProposalClaim
    // =====================================================================================================================

    /**
     * @dev Fuzz test: tests that the verifyProposalClaim function reverts when the proposal has not been submitted.
     * It assumes the context key is not zero.
     */
     /*
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
    */
    /**
     * @dev Tests that the verifyProposalClaim function succeeds when the context key is valid and a submission for that key has been verified.
     */
    /*
    function test_verifyProposalClaim_SucceedsWhenContextKeyIsValid() public {
        vm.startPrank(governor);
        proposalManager.setProposalClaimVerifier(address(mockProposalClaimVerifier));

        // verify a proposal first to ensure the claim can be verified
        proposalManager.verifyProposal(
            proof,
            publicSignals,
            validContextHash,
            validCurrentRoot
        );

        vm.expectEmit(true, true, true, true);
        emit ProposalManager.ClaimVerified(validContextHash, validClaimNullifier, validSubmissionNullifier);
        proposalManager.verifyProposalClaim(
            proof,
            publicSignalsClaim,
            validContextHash
        );
        vm.stopPrank();
    }
    */

    // =====================================================================================================================
    //                                     Helper Functions
    // =====================================================================================================================
    /*
    function _supportsIProposalInterface(address _address) private view returns (bool) {
        uint256[24] memory dummyProof = [uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
        uint256[5] memory dummyPublicSignals = [uint256(1), 2, 3, 4, 5];

        try IProposalVerifier(_address).verifyProof(dummyProof, dummyPublicSignals) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }
    */





}