// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "./mocks/MockProposalVerifier.sol";
import "./mocks/MockProposalClaimVerifier.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { ProposalManager } from "hardhat-contracts/managers/ProposalManager.sol";
import { IProposalManager } from "hardhat-contracts/interfaces/IProposalManager.sol";
import { IMembershipManager } from "hardhat-contracts/interfaces/IMembershipManager.sol";


contract ProposalManagerTest is Test {
    MockProposalVerifier private proposalVerifier;
    MockProposalClaimVerifier private proposalClaimVerifier;
    ProposalManager private proposalManager;

    address governor = vm.addr(1);
    bytes32 contextKey = bytes32(uint256(keccak256(abi.encodePacked("contextKey"))));
    bytes32 currentRoot = bytes32(uint256(keccak256(abi.encodePacked("currentRoot"))));

    uint256[5] private publicSignals = [
            uint256(keccak256(abi.encodePacked("contextKey"))), 
            uint256(keccak256(abi.encodePacked("proposalNullifier"))), 
            uint256(keccak256(abi.encodePacked("claimNullifier"))),
            uint256(keccak256(abi.encodePacked("currentRoot"))),
            uint256(keccak256(abi.encodePacked("contentHash")))
        ];

    function setUp() public {
        proposalVerifier = new MockProposalVerifier();
        proposalClaimVerifier = new MockProposalClaimVerifier();
        ProposalManager impl = new ProposalManager();

        // initializer calldata
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,address,address)",
            governor, 
            address(proposalVerifier),
            address(proposalClaimVerifier)
        );
        
        // deploy proxy pointing to the implementation contract
        // and initialize it with the provided calldata
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);

        // cast the proxy to ProposalManager interface
        proposalManager = ProposalManager(address(proxy));
    }

    function testSetProposalSubmissionVerifier() public {
        address newVerifier = address(0x123);
        
        vm.startPrank(governor);
        proposalManager.setProposalSubmissionVerifier(newVerifier);
        assertEq(proposalManager.getProposalSubmissionVerifier(), newVerifier);
        vm.stopPrank();
    }

    function testVerifyProposal_Fuzz(uint256[24] memory proof) public {

        vm.startPrank(governor);
        proposalManager.verifyProposal(proof, publicSignals, contextKey, currentRoot);
        vm.stopPrank();
    }

    function testVerifyProposal_Fuzz_Fails(uint256[24] memory proof) public {

        bytes32 proposalNullifier = bytes32(publicSignals[1]);

        vm.startPrank(governor);
        proposalVerifier.setIsValid(false);
        vm.expectRevert((abi.encodeWithSelector(ProposalManager.InvalidSubmissionProof.selector, contextKey, proposalNullifier)));
        // (abi.encodeWithSelector(InvalidSubmissionProof.selector, contextKey, proposalNullifier)
        proposalManager.verifyProposal(proof, publicSignals, contextKey, currentRoot);
        vm.stopPrank();
    }


}