// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "forge-std/StdInvariant.sol";

// OZ Imports:
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Contracts:
import { MembershipManager } from "hardhat-contracts/managers/MembershipManager.sol";
import { ProposalManager } from "hardhat-contracts/managers/ProposalManager.sol";
import { VoteManager } from "hardhat-contracts/managers/VoteManager.sol";
import { ERC721IgnitionZK } from "hardhat-contracts/token/ERC721IgnitionZK.sol";
import { MockVoteManagerHelper } from "hardhat-contracts/mocks/MockVoteManagerHelper.sol";

// Verifiers:
import { MockProposalVerifier } from "hardhat-contracts/mocks/MockProposalVerifier.sol";
import { MockProposalClaimVerifier } from "hardhat-contracts/mocks/MockProposalClaimVerifier.sol";
import { MockVoteVerifier } from "hardhat-contracts/mocks/MockVoteVerifier.sol";
import { MembershipVerifier } from "hardhat-contracts/verifiers/MembershipVerifier.sol";

// Interfaces: 
import { IMembershipManager } from "hardhat-contracts/interfaces/managers/IMembershipManager.sol";
import { IProposalManager } from "hardhat-contracts/interfaces/managers/IProposalManager.sol";
import { IVoteManager } from "hardhat-contracts/interfaces/managers/IVoteManager.sol";
import { IMembershipManager } from "hardhat-contracts/interfaces/managers/IMembershipManager.sol";
import { IProposalVerifier } from "hardhat-contracts/interfaces/verifiers/IProposalVerifier.sol";
import { IVoteVerifier } from "hardhat-contracts/interfaces/verifiers/IVoteVerifier.sol";

// Libraries:
import { VoteTypes } from "hardhat-contracts/libraries/VoteTypes.sol";

/**
 * @notice Fuzz Tests for VoteManager
 * @dev We only use Foundry for Fuzz testing the relevant functions. 
 * The rest of the unit tests can be found in the hardhat test suite.
 */
contract VoteManagerTest is StdInvariant, Test {
    // Managers
    MembershipManager membershipManager;
    ProposalManager proposalManager;
    MockVoteManagerHelper voteManagerHelper;

    // ERC721 
    ERC721IgnitionZK nftImplementation;

    // Verifiers
    MockProposalVerifier mockProposalVerifier;
    MockProposalClaimVerifier mockProposalClaimVerifier;
    MockVoteVerifier mockVoteVerifier;

    // mock owner
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
            uint256(validContextHash), 
            uint256(validSubmissionNullifier), 
            uint256(validClaimNullifier),
            uint256(validCurrentRoot),
            uint256(validContentHash)
        ];
    
    // Public signals for the vote verification
    uint256[5] private votePublicSignals = [
            uint256(validContextHash), 
            uint256(validVoteNullifier), 
            uint256(validVoteChoiceHashYes),
            uint256(validCurrentRoot),
            uint256(validSubmissionNullifier)
        ];
    
    
    uint256 lastMemberCount;

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
        //VoteManager voteManagerImpl = new VoteManager();
        MockVoteManagerHelper voteManagerHelperImpl = new MockVoteManagerHelper();

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

        // prepare the calldata for VoteManagerHelper initializer
        bytes memory initDataVoteManagerHelper = abi.encodeWithSelector(
            VoteManager.initialize.selector,
            governor, 
            address(mockVoteVerifier),
            address(membershipManager),
            address(proposalManager)
        );
        
        // deploy proxy pointing to the implementation contract
        ERC1967Proxy proxyVoteManagerHelper = new ERC1967Proxy(
            address(voteManagerHelperImpl), 
            initDataVoteManagerHelper
        );

        // cast the proxy to VoteManagerHelper interface
        voteManagerHelper = MockVoteManagerHelper(address(proxyVoteManagerHelper));

        lastMemberCount = 0;
        targetContract(address(this));
    }

    /** 
     * @dev Fuzz test: setMemberCount with fuzzed member count between 1 and 1024 
     * Assumes _memberCount is not zero and is less than or equal to 1024.
     */
    function testFuzz_setMemberCount_SucceedsWithFuzzedMemberCount(uint256 _memberCount) public {
        vm.startPrank(governor);
        vm.assume(_memberCount != 0);
        vm.assume(_memberCount <= 1024);

        // Deploy the Group NFT and set the Merkle Root
        _deployGroupNftAndSetRoot();

        // Expect the MemberCountSet event to be emitted
        vm.expectEmit(true, true, false, false);
        emit VoteManager.MemberCountSet(validGroupKey, _memberCount);

        // 3. Set member count
        voteManagerHelper.setMemberCount(validGroupKey, _memberCount);

        // Assert that the stored member count matches
        (uint256 storedMemberCount, uint256 quorum) = voteManagerHelper.groupParams(validGroupKey);
        assertEq(storedMemberCount, _memberCount, "Member count mismatch");

        // Assert that quorum is between 25 and 50
        assertGe(quorum, 25, "Quorum is less than 25");
        assertLe(quorum, 50, "Quorum is greater than 50");

        vm.stopPrank();
    }

    /*
     * @dev Edge Case Test: setMemberCount reverts when member count is too high
     */
    function test_setMemberCount_RevertsWhenMemberCountIsHigh() public {
        vm.startPrank(governor);
        
        // Deploy the Group NFT and set the Merkle Root
        _deployGroupNftAndSetRoot();

        vm.expectRevert(VoteManager.InvalidMemberCount.selector);
        // 3. Set member count
        voteManagerHelper.setMemberCount(validGroupKey, 1025);
        vm.stopPrank();
    }

    /*
     * @dev Edge Case Test: setMemberCount succeeds when member count is one
     */
    function test_setMemberCount_SucceedsWhenMemberCountIsOne() public {
        vm.startPrank(governor);
        
        // Deploy the Group NFT and set the Merkle Root
        _deployGroupNftAndSetRoot();

        // Expect the MemberCountSet event to be emitted
        vm.expectEmit(true, true, false, false);
        emit VoteManager.MemberCountSet(validGroupKey, 1);
        // 3. Set member count
        voteManagerHelper.setMemberCount(validGroupKey, 1);
        
        // Ensure member count and quorum are correct
        (uint256 memberCount, uint256 quorum) = voteManagerHelper.groupParams(validGroupKey);
        assertEq(quorum, 50, "Quorum is not 50");
        assertEq(memberCount, 1, "Member count is not 1");
        vm.stopPrank();
    }

    /*
     * @dev Edge Case Test: setMemberCount succeeds when member count is 1024
     */
    function test_setMemberCount_SucceedsWhenMemberCountIs1024() public {
        vm.startPrank(governor);
        
        // Deploy the Group NFT and set the Merkle Root
        _deployGroupNftAndSetRoot();

        // Expect the MemberCountSet event to be emitted
        vm.expectEmit(true, true, false, false);
        emit VoteManager.MemberCountSet(validGroupKey, 1024);

        // 3. Set member count
        voteManagerHelper.setMemberCount(validGroupKey, 1024);

        // Ensure member count and quorum are correct
        (uint256 memberCount, uint256 quorum) = voteManagerHelper.groupParams(validGroupKey);
        assertEq(quorum, 25, "Quorum is not 25");
        assertEq(memberCount, 1024, "Member count is not 1024");
        vm.stopPrank();
    }

    /*
     * @dev Edge Case Test: setMemberCount succeeds when member count is 30
     */
    function test_setMemberCount_QuorumIs50WhenMemberCountIs30() public {
        vm.startPrank(governor);
        
        // Deploy the Group NFT and set the Merkle Root
        _deployGroupNftAndSetRoot();

        // Set member count
        voteManagerHelper.setMemberCount(validGroupKey, 30);
        (uint256 memberCount, uint256 quorum) = voteManagerHelper.groupParams(validGroupKey);
        assertEq(quorum, 50, "Quorum is not 50");
        vm.stopPrank();
    }

    /*
     * @dev Edge Case Test: setMemberCount succeeds when member count is 200
     */
    function test_setMemberCount_QuorumIs25WhenMemberCountIs200() public {
        vm.startPrank(governor);
        
        // Deploy the Group NFT and set the Merkle Root
        _deployGroupNftAndSetRoot();

        // Set member count
        voteManagerHelper.setMemberCount(validGroupKey, 200);
        (uint256 memberCount, uint256 quorum) = voteManagerHelper.groupParams(validGroupKey);
        assertEq(quorum, 25, "Quorum is not 25");
        vm.stopPrank();
    }

    /*
     * @dev Fuzz Test: linearInterpolation with fuzzed x between x1 and x2
     * Assumes x is between x1 and x2
     */
    function testFuzz_linearInterpolation(uint256 x) public {
        vm.startPrank(governor);

        // Get the x1 and x2 values
        VoteTypes.QuorumParams memory params = voteManagerHelper.getQuorumParams();
        uint256 x1 = params.minGroupSizeForMaxQuorum;
        uint256 x2 = params.maxGroupSizeForMinQuorum;

        // Confine x to be within x1 and x2
        x = bound(x, x1 + 1, x2 - 1);

        uint256 quorum = voteManagerHelper.exposed_linearInterpolation(x);

        // Ensure that output is within the min and max allowed quorum values
        assertTrue(
            quorum >= params.minQuorumPercent &&
            quorum <= params.maxQuorumPercent, 
            "Interpolation result outside of expected range"
        );

        // Check that the quorum output from the contract matches the implementation in this test
        uint256 expectedQuorum = _applyLinearInterpolation(x);
        assertEq(expectedQuorum, quorum, "Quorum outputs do not match");

        vm.stopPrank();
    }

    /*
     * @dev Fuzz Test: ceilDiv with fuzzed a and b.
     * @param a The numerator
     * @param b The denominator
     * Assumes both a and b are not zero and they are between 1 and 1024.
     */
    function testFuzz_ceilDiv(uint256 a, uint256 b) public {
        vm.startPrank(governor);
        // a and b inputs cannot be outside the 1 to 1024 range in _computePassedStatus
        a = bound(a, 1, 1024);
        b = bound(b, 1, 1024);
        // compute ceiling division from the contract
        uint256 ceilDivOutput = voteManagerHelper.exposed_ceilDiv(a, b);

        // calculated the expected value
        uint256 expectedOutput = _applyCeilDiv(a, b);

        assertEq(ceilDivOutput, expectedOutput, "Output of ceiling division does not match");
        vm.stopPrank();
    }

    /// @dev Invariant tests

    /*
     * @dev Handler function for invariant test
     */
    function handler_setMemberCount(uint256 _memberCount) public {
        _memberCount = bound(_memberCount, 1, 1024);
        vm.startPrank(governor);

        if(lastMemberCount == 0) {
            _deployGroupNftAndSetRoot();
        }

        voteManagerHelper.setMemberCount(validGroupKey, _memberCount);
        lastMemberCount = _memberCount;

        vm.stopPrank();
    }

    /*
     * @dev Invariant Test for memberCount
     */
    function invariant_memberCountInValidRange() public {

        if (lastMemberCount == 0) return;

        (uint256 storedMemberCount, uint256 storedQuorum) = voteManagerHelper.groupParams(validGroupKey);

        assertEq(storedMemberCount, lastMemberCount, "Member count doesn't match");
        assertGe(storedMemberCount, 1, "Member count cannot be 0");
        assertLe(storedMemberCount, 1024, "Member count too high");
        assertGe(storedQuorum, 25, "Quorum too low");
        assertLe(storedQuorum, 50, "Quorum too high");
    }

    /*
     * @dev Invariant Test for quorum (linear interpolation)
     */
    function invariant_quorumIsLinearlyInterpolated() public {
        if (lastMemberCount == 0) return;

        (uint256 storedMemberCount, uint256 storedQuorum) = voteManagerHelper.groupParams(validGroupKey);

        if (storedMemberCount <= 30) {
            assertEq(storedQuorum, 50);
        } 
        else if (storedMemberCount >= 200) {
            assertEq(storedQuorum, 25);
        }
        else {
            uint256 expectedQuorum = _applyLinearInterpolation(storedMemberCount);
            assertEq(expectedQuorum, storedQuorum, "Expected and stored quorum values should match");
        }
    }

    /**
     * @dev Helper Function: Applies linear interpolation to find the quorum percentage based on group size.
     * This function is used to compare the linear interpolation result to the value obtained from the contract function.
     */
    function _applyLinearInterpolation(uint256 x) private returns (uint256) {
        VoteTypes.QuorumParams memory params = voteManagerHelper.getQuorumParams();
        uint256 yScalingFactor = 1e4; 
        uint256 x1 = params.minGroupSizeForMaxQuorum;
        uint256 y1Scaled = params.maxQuorumPercent * yScalingFactor;
        uint256 x2 = params.maxGroupSizeForMinQuorum;
        uint256 y2Scaled = params.minQuorumPercent * yScalingFactor;

        uint256 scalingFactor = 1e4;
        uint256 slopeNumeratorPositive = y1Scaled - y2Scaled;
        uint256 slopeDenominator =  x2 - x1;
        uint256 slopePositiveScaled = slopeNumeratorPositive * scalingFactor / slopeDenominator;

        uint256 quorumScaled = y1Scaled - (slopePositiveScaled * (x - x1)) / scalingFactor;
        return quorumScaled / scalingFactor;
    }

    /*
     * @dev Helper Function: Applies ceiling division to find the amount of required votes based on quorum in _computePassedStatus.
     * This function is used to compare the linear interpolation result to the value obtained from the contract function.
     */
    function _applyCeilDiv(uint256 a, uint256 b) private pure returns (uint256) {  
        return (a + b - 1) / b;
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
