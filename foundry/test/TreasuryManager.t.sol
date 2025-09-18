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
import { VoteManager } from "hardhat-contracts/managers/VoteManager.sol";
import { ERC721IgnitionZK } from "hardhat-contracts/token/ERC721IgnitionZK.sol";
import { GovernanceManager } from "hardhat-contracts/governance/GovernanceManager.sol";
import { GrantModule } from "hardhat-contracts/fundingModules/GrantModule.sol";
import { TreasuryFactory } from "hardhat-contracts/treasury/TreasuryFactory.sol";
import { TreasuryManager } from "hardhat-contracts/treasury/TreasuryManager.sol";
import { BeaconManager } from "hardhat-contracts/treasury/BeaconManager.sol";

// Verifiers:
import { MockProposalVerifier } from "hardhat-contracts/mocks/MockProposalVerifier.sol";
import { MockProposalClaimVerifier } from "hardhat-contracts/mocks/MockProposalClaimVerifier.sol";
import { MockVoteVerifier } from "hardhat-contracts/mocks/MockVoteVerifier.sol";
import { MembershipVerifier } from "hardhat-contracts/verifiers/MembershipVerifier.sol";

// Interfaces: 
import { IMembershipManager } from "hardhat-contracts/interfaces/managers/IMembershipManager.sol";
import { IProposalManager } from "hardhat-contracts/interfaces/managers/IProposalManager.sol";
import { IVoteManager } from "hardhat-contracts/interfaces/managers/IVoteManager.sol";
import { ITreasuryManager } from "hardhat-contracts/interfaces/treasury/ITreasuryManager.sol";
import { ITreasuryFactory } from "hardhat-contracts/interfaces/treasury/ITreasuryFactory.sol";
import { IGrantModule } from "hardhat-contracts/interfaces/fundingModules/IGrantModule.sol";
import { IMembershipManager } from "hardhat-contracts/interfaces/managers/IMembershipManager.sol";
import { IProposalVerifier } from "hardhat-contracts/interfaces/verifiers/IProposalVerifier.sol";
import { IVoteVerifier } from "hardhat-contracts/interfaces/verifiers/IVoteVerifier.sol";

// Libraries:
import { VoteTypes } from "hardhat-contracts/libraries/VoteTypes.sol";

/**
 * @notice Fuzz Tests for TreasuryManager
 * @dev We only use Foundry for Fuzz testing the relevant functions. 
 * The rest of the unit tests can be found in the hardhat test suite.
 */
contract TreasuryManagerTest is Test {
    // Managers
    MembershipManager membershipManager;
    ProposalManager proposalManager;
    VoteManager voteManager;

    // Governance
    GovernanceManager governanceManager;

    // Funding Modules
    GrantModule grantModule;

    // Treasury
    TreasuryFactory treasuryFactory;
    TreasuryManager treasuryManager;
    BeaconManager beaconManager;

    // ERC721 
    ERC721IgnitionZK nftImplementation;

    // Verifiers
    MockProposalVerifier mockProposalVerifier;
    MockProposalClaimVerifier mockProposalClaimVerifier;
    MockVoteVerifier mockVoteVerifier;

    // addresses
    address ignitionZKMultiSig = vm.addr(1);
    address daoMultiSig = vm.addr(2);
    address daoRecovery = vm.addr(3);
    address relayer = vm.addr(4);
    address governor = vm.addr(5);
    address recipient = vm.addr(6);

    // Mock ERC721 token name and symbol
    string nftName = "Test Group NFT";
    string nftSymbol = "TGNFT";

    // fundingTypes
    bytes32 grantType = keccak256("grant");
    
    // Mock proof data
    bytes32 validGroupKey = keccak256(abi.encodePacked("groupKey"));
    bytes32 validProposalContextHash = keccak256(abi.encodePacked("proposalContextKey"));
    bytes32 validVoteContextHash = keccak256(abi.encodePacked("voteContextKey"));
    bytes32 validSubmissionNullifier = keccak256(abi.encodePacked("proposalNullifier"));
    bytes32 validClaimNullifier = keccak256(abi.encodePacked("claimNullifier"));
    bytes32 validCurrentRoot = keccak256(abi.encodePacked("currentRoot"));
    bytes32 validContentHash = keccak256(abi.encodePacked("contentHash"));
    bytes32 validVoteNullifier = keccak256(abi.encodePacked("voteNullifier"));
    uint256 validVoteChoiceHashYes = 18586133768512220936620570745912940619677854269274689475585506675881198879027;

    // mock proof
    uint256[24] private proof = [
            uint256(1), 2, 3, 4, 5, 6, 7, 8, 9, 10, 
            11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
            21, 22, 23, 24
        ];

    // Public signals for the proposal verification
    uint256[5] private proposalPublicSignals = [
            uint256(validProposalContextHash), 
            uint256(validSubmissionNullifier), 
            uint256(validClaimNullifier),
            uint256(validCurrentRoot),
            uint256(validContentHash)
        ];
    
    // Public signals for the vote verification
    uint256[5] private votePublicSignals = [
            uint256(validVoteContextHash), 
            uint256(validVoteNullifier), 
            uint256(validVoteChoiceHashYes),
            uint256(validCurrentRoot),
            uint256(validSubmissionNullifier)
        ];

    function setUp() public {
        // deploy the mock verifiers
        mockProposalVerifier = new MockProposalVerifier();
        mockProposalClaimVerifier = new MockProposalClaimVerifier();
        mockVoteVerifier = new MockVoteVerifier();

        // deploy the NFT implementation contract
        nftImplementation = new ERC721IgnitionZK();

        // deploy the implementation contracts
        ProposalManager proposalManagerImpl = new ProposalManager();
        MembershipManager membershipManagerImpl = new MembershipManager();
        MembershipVerifier membershipVerifier = new MembershipVerifier();
        VoteManager voteManagerImpl = new VoteManager();
        
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
        membershipManager = MembershipManager(payable(address(proxyMembershipManager)));

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
        proposalManager = ProposalManager(payable(address(proxyProposalManager)));

        // prepare the calldata for VoteManager initializer
        bytes memory initDataVoteManager = abi.encodeWithSelector(
            VoteManager.initialize.selector,
            governor, 
            address(mockVoteVerifier),
            address(membershipManager),
            address(proposalManager)
        );
        
        // deploy proxy pointing to the implementation contract
        ERC1967Proxy proxyVoteManager = new ERC1967Proxy(
            address(voteManagerImpl), 
            initDataVoteManager
        );

        // cast the proxy to VoteManager interface
        voteManager = VoteManager(payable(address(proxyVoteManager)));

        // Deploy GovernanceManager
        GovernanceManager governanceManagerImpl = new GovernanceManager();

        // prepare the calldata for GovernanceManager initializer
        bytes memory initDataGovernanceManager = abi.encodeWithSelector(
            GovernanceManager.initialize.selector,
            ignitionZKMultiSig,
            relayer,
            address(membershipManager),
            address(proposalManager),
            address(voteManager)
        );

        // deploy proxy pointing to the implementation contract
        ERC1967Proxy proxyGovernanceManager = new ERC1967Proxy(
            address(governanceManagerImpl),
            initDataGovernanceManager
        );

        // cast the proxy to GovernanceManager interface
        governanceManager = GovernanceManager(payable(address(proxyGovernanceManager)));

        // Transfer Ownership of MM, PM, VM to GM
        vm.startPrank(governor);
        membershipManager.transferOwnership(address(governanceManager));
        proposalManager.transferOwnership(address(governanceManager));
        voteManager.transferOwnership(address(governanceManager));
        vm.stopPrank();

        // Deploy TreasuryManager without initialization
        TreasuryManager treasuryManagerImpl = new TreasuryManager();

        // Deploy BeaconManager with the TreasuryManager implementation address
        BeaconManager beaconManagerImpl = new BeaconManager(address(treasuryManagerImpl), ignitionZKMultiSig);

        // Deploy TreasuryFactory with the BeaconManager address
        TreasuryFactory treasuryFactoryImpl = new TreasuryFactory(
            address(beaconManagerImpl), 
            address(governanceManager), 
            address(membershipManager)
        );

        // Set TreasuryFactory address in GovernanceManager
        vm.startPrank(ignitionZKMultiSig);
        governanceManager.setTreasuryFactory(address(treasuryFactoryImpl));
        vm.stopPrank();

        // Deploy GrantModule
        GrantModule grantModuleImpl = new GrantModule();
        
        // prepare the calldata for GrantModule initializer
        bytes memory initDataGrantModule = abi.encodeWithSelector(
            GrantModule.initialize.selector,
            address(governanceManager)
        );

        // deploy proxy pointing to the implementation contract
        ERC1967Proxy proxyGrantModule = new ERC1967Proxy(
            address(grantModuleImpl),
            initDataGrantModule
        );

        // Set grant module address in GovernanceManager
        vm.startPrank(ignitionZKMultiSig);
        governanceManager.addFundingModule(address(proxyGrantModule), keccak256("grant"));
        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: requestTransfer with fuzzed amount
     * Assumes amount is greater than zero.
     */
    function testFuzz_requestTransfer_FuzzedAmount(uint256 fuzzedAmount) public {
        vm.assume(fuzzedAmount > 0);
        vm.startPrank(relayer);
        // Deploy NFT and set root
        _deployGroupNftAndSetRoot();

        // Set group member count to 2
        governanceManager.delegateSetMemberCount(validGroupKey, 2);

        // Deploy group treasury
        _deployTreasuryInstance();

        address treasuryAddress = governanceManager.delegateGetTreasuryAddress(validGroupKey);

        // Verify a proposal
        governanceManager.delegateVerifyProposal(
            proof, 
            proposalPublicSignals, 
            validGroupKey,
            validProposalContextHash
        );

        // Verify a vote on the proposal
        governanceManager.delegateVerifyVote(
            proof,
            votePublicSignals,
            validGroupKey,
            validVoteContextHash
        );

        // trigger funding request
        governanceManager.delegateDistributeFunding(
            validGroupKey,
            validVoteContextHash,
            recipient,
            fuzzedAmount, 
            grantType,
            validSubmissionNullifier // expectedProposalNullifier
        );

        bool isPending = governanceManager.delegateIsPendingApproval(validGroupKey, validVoteContextHash);
        assertEq(isPending, true, "Funding request should be pending");

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: requestTransfer with varying treasury balance and varying funding amounts.
     * Assumes fuzzedAmount is greater than zero and less than or equal to fuzzedBalance.
     */
    function testFuzz_requestTransfer_FuzzedAmountVaryingBalance(uint256 fuzzedAmount, uint256 fuzzedBalance) public {
        vm.assume(fuzzedAmount > 0 && fuzzedAmount <= fuzzedBalance);
        vm.assume(fuzzedBalance > 0 && fuzzedBalance < type(uint128).max);

        vm.startPrank(relayer);
        // Deploy NFT and set root
        _deployGroupNftAndSetRoot();
        // Set group member count to 2
        governanceManager.delegateSetMemberCount(validGroupKey, 2);
        // Deploy group treasury
        _deployTreasuryInstance();
        // Treasury address
        address treasuryAddress = governanceManager.delegateGetTreasuryAddress(validGroupKey);

        // Verify a proposal
        governanceManager.delegateVerifyProposal(
            proof, 
            proposalPublicSignals, 
            validGroupKey,
            validProposalContextHash
        );

        // Verify a vote on the proposal
        governanceManager.delegateVerifyVote(
            proof,
            votePublicSignals,
            validGroupKey,
            validVoteContextHash
        );

        // trigger funding request
        governanceManager.delegateDistributeFunding(
            validGroupKey,
            validVoteContextHash,
            recipient,
            fuzzedAmount, 
            grantType,
            validSubmissionNullifier // expectedProposalNullifier
        );
        vm.stopPrank();

        vm.startPrank(daoMultiSig);

        // Skip treasury timelock
        vm.warp(block.timestamp + 3 days);
        
        // Fund treasury
        vm.deal(treasuryAddress, fuzzedBalance);
        uint256 recipientBalanceBefore = recipient.balance;
        uint256 treasuryBalanceBefore = treasuryAddress.balance;

        // Approve and execute transfer
        ITreasuryManager(treasuryAddress).approveAndExecuteTransfer(validVoteContextHash);

        uint256 recipientBalanceAfter = recipient.balance;
        uint256 treasuryBalanceAfter = treasuryAddress.balance;

        assertEq(recipientBalanceAfter - recipientBalanceBefore, fuzzedAmount, "Recipient should have received the correct amount");
        assertEq(treasuryBalanceBefore - treasuryBalanceAfter, fuzzedAmount, "Treasury should have sent the correct amount");

        vm.stopPrank();
    }

    /**
     * @dev Fuzz test: multiple concurrent funding requests with varying amounts.
     * Assumes both amounts are greater than zero and less than or equal to 50 ether.
     */
    function testFuzz_multipleConcurrentRequests(uint256 amount1, uint256 amount2) public {
        vm.assume(amount1 > 0 && amount1 < 50 ether);
        vm.assume(amount2 > 0 && amount2 < 50 ether);

        vm.startPrank(relayer);
        
        // Setup
        _deployGroupNftAndSetRoot();
        governanceManager.delegateSetMemberCount(validGroupKey, 2);
        _deployTreasuryInstance();
        
        // Fund treasury
        address treasuryAddress = governanceManager.delegateGetTreasuryAddress(validGroupKey);
        vm.deal(treasuryAddress, amount1 + amount2 + 0.5 ether);
        
        // Create a second vote context for testing
        bytes32 secondVoteContext = keccak256(abi.encodePacked("secondVoteContext"));
        bytes32 secondProposalContext = keccak256(abi.encodePacked("secondProposalContext"));
        bytes32 secondSubmissionNullifier = keccak256(abi.encodePacked("secondNullifier"));
        bytes32 secondVoteNullifier = keccak256(abi.encodePacked("secondVoteNullifier"));
        bytes32 secondProposalContent = keccak256(abi.encodePacked("secondProposalContent"));

        // First request (verify proposal, verify vote and request funding)
        governanceManager.delegateVerifyProposal(
            proof, 
            proposalPublicSignals, 
            validGroupKey,
            validProposalContextHash
        );
        
        governanceManager.delegateVerifyVote(
            proof,
            votePublicSignals,
            validGroupKey,
            validVoteContextHash
        );
        
        governanceManager.delegateDistributeFunding(
            validGroupKey,
            validVoteContextHash,
            recipient,
            amount1, 
            grantType,
            validSubmissionNullifier
        );
        
        // Update the public signals for the second proposal
        uint256[5] memory secondProposalSignals = proposalPublicSignals;
        secondProposalSignals[0] = uint256(secondProposalContext);
        secondProposalSignals[1] = uint256(secondSubmissionNullifier);
        
        // Update the public signals for the second vote
        uint256[5] memory secondVoteSignals = votePublicSignals;
        secondVoteSignals[0] = uint256(secondVoteContext);
        secondVoteSignals[1] = uint256(secondVoteNullifier);
        secondVoteSignals[4] = uint256(secondSubmissionNullifier);
        
        // Second request
        governanceManager.delegateVerifyProposal(
            proof, 
            secondProposalSignals, 
            validGroupKey,
            secondProposalContext
        );
        
        governanceManager.delegateVerifyVote(
            proof,
            secondVoteSignals,
            validGroupKey,
            secondVoteContext
        );
        
        governanceManager.delegateDistributeFunding(
            validGroupKey,
            secondVoteContext,
            vm.addr(7), // different recipient
            amount2, 
            grantType,
            secondSubmissionNullifier
        );
        
        vm.stopPrank();
        
        // Verify both requests are pending
        bool isFirstPending = governanceManager.delegateIsPendingApproval(validGroupKey, validVoteContextHash);
        bool isSecondPending = governanceManager.delegateIsPendingApproval(validGroupKey, secondVoteContext);
        
        assertEq(isFirstPending, true, "First funding request should be pending");
        assertEq(isSecondPending, true, "Second funding request should be pending");
    }



    /**
     * @dev Helper Function: Deploys the group NFT and sets the Merkle root.
     */
    function _deployGroupNftAndSetRoot() private {
        // 1. Deploy group NFT
        governanceManager.delegateDeployGroupNft(
            validGroupKey,
            nftName,
            nftSymbol
        );
        
        // 2. Set the root for the group
        governanceManager.delegateSetRoot(validCurrentRoot, validGroupKey);
    }

    function _deployTreasuryInstance() private {
        // Deploy the treasury instance via the factory
        governanceManager.delegateDeployTreasury(
            validGroupKey,
            daoMultiSig,
            daoRecovery
        );
    }
}
