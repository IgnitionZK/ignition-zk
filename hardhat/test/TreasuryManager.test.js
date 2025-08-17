const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Treasury Manager Unit Tests:", function () {

    let fixtures;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {

        fixtures = await setUpFixtures();

        ({
            // Signers
            governor, user1, deployer, relayer,
            
            // Test constants
            groupKey, groupKey2,epochKey, proposalKey, 
            voteContextKey, proposalContextKey,
            rootHash1, rootHash2,
            voteNullifier1, voteNullifier2, voteNullifier3, voteNullifier4,
            submissionNullifier1, submissionNullifier2,
            claimNullifier1, claimNullifier2,
            contentHash1, contentHash2,
            voteChoiceNo, voteChoiceYes, voteChoiceAbstain,
            nftName, nftSymbol, nftName2, nftSymbol2,
            mockProof, mockVotePublicSignals1, mockVotePublicSignals2, mockVotePublicSignals3, mockVotePublicSignals4,
            mockProposalProof, mockProposalPublicSignals1,
            realGroupId, realEpochId, realProposalId, 
            realGroupKey, realEpochKey, realProposalKey, 
            realProposalContextKey, realVoteContextKey, realRoot, 
            realVoteProof, realVotePublicSignals, voteProofContextHash, voteProofNullifier, voteProofChoice, voteProofRoot, voteProofSubmissionNullifier,
            realProposalProof, realProposalPublicSignals, proposalProofContextHash, proposalProofSubmissionNullifier, proposalProofClaimNullifier, proposalProofRoot, proposalProofContentHash
        } = fixtures);
       
        });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {

        const deployedFixtures = await deployFixtures();

        ({
            membershipManager, proposalManager, voteManager, governanceManager, 
            treasuryManager, treasuryFactory, beaconManager, grantModule,
            membershipVerifier, proposalVerifier, proposalClaimVerifier, voteVerifier,
            mockMembershipVerifier, mockProposalVerifier, mockProposalClaimVerifier, mockVoteVerifier
        } = deployedFixtures);

    });

    it(`FUNCTION: transferAdminRole
        TESTING: event: AdminRoleTransferred
        EXPECTED: should let treasury owner transfer the default admin role`, async function () {
        
    });

});