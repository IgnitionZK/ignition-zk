const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");

describe("Vote Manager Unit Tests:", function () {

    let fixtures;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {

        fixtures = await setUpFixtures();

        ({
            // Signers
            governor, user1, deployer, relayer,
            
            // Test constants
            groupKey, epochKey, proposalKey, 
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
            voteManager, mockVoteVerifier, voteVerifier,
            membershipManager, membershipVerifier,
            proposalManager, proposalVerifier, proposalClaimVerifier,
            mockProposalVerifier, mockProposalClaimVerifier
        } = deployedFixtures);

    });
    
    async function deployGroupNftAndSetRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).setRoot(root, group);
    }

    async function setSubmissionVerifierAndVerifyProposal(signer, verifier, proof, publicSignals, voteContextKey, root) {
        // Set the proposal submission verifier
        await proposalManager.connect(signer).setProposalSubmissionVerifier(verifier);
        // Verify the proposal
        return await proposalManager.connect(signer).verifyProposal(
            proof,
            publicSignals,
            voteContextKey,
            root
        );
    }

    async function setVoteVerifierAndVerifyVote(signer, verifier, proof, publicSignals, voteContextKey, groupKey, root) {
        // Set the vote verifier
        await voteManager.connect(signer).setVoteVerifier(verifier);
        // Verify the vote
        return await voteManager.connect(signer).verifyVote(
            proof,
            publicSignals,
            voteContextKey,
            groupKey,
            root,
            true // isProposalSubmitted
        ); 
    }

    async function linearInterpolation(x) {
        // Linear interpolation function
        x1 = 30;
        x2 = 200;
        y1 = 50;
        y2 = 25;
        slopePositive = (y1 - y2) / (x2 - x1);
        return Math.floor(y1 - slopePositive * (x - x1));
    }

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy VoteVerifier and VoteManager contracts`, async function () {
        expect(await voteVerifier.target).to.be.properAddress;
        expect(await voteManager.target).to.be.properAddress;
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner of VoteManager`, async function () {
        expect(await voteManager.owner()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: onlyOwner(), transferOwnership()
        EXPECTED: should allow the governor to transfer ownership of the vote manager`, async function () {
        await voteManager.connect(governor).transferOwnership(await user1.getAddress());
        expect(await voteManager.owner()).to.equal(await user1.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  onlyOwner(), transferOwnership()
        EXPECTED: should not allow non-governor to transfer ownership of the vote manager`, async function () {
        await expect(voteManager.connect(user1).transferOwnership(await governor.getAddress()))
            .to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  error: OwnableInvalidOwner, transferOwnership()
        EXPECTED: should not allow governor to transfer ownership to the zero address`, async function () {
        await expect(voteManager.connect(governor).transferOwnership(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(voteManager, "OwnableInvalidOwner");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to upgrade the vote manager contract`, async function () {

        const proxyAddress = await voteManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the vote manager contract to a new version
        const VoteManagerV2 = await ethers.getContractFactory("MockVoteManagerV2", { signer: governor });
        const voteManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            VoteManagerV2, 
            {
                kind: "uups"
            }
        );
        await voteManagerV2.waitForDeployment();

        const upgradedAddress = await voteManagerV2.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);

        // Check if the upgrade was successful
        expect(newImplementationAddress).to.be.properAddress;
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it(`FUNCTIONALITY: upgradeability 
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to upgrade the vote manager contract`, async function () {

        const VoteManagerV2 = await ethers.getContractFactory("MockVoteManagerV2", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            await voteManager.target,
            VoteManagerV2,
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: proxy data storage: nullifiers, quorum parameters
        EXPECTED: should preserve proxy data after upgrade`, async function () {

        // deploy group NFT and set group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await voteManager.connect(governor).setMemberCount(groupKey, 1);
   
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);
       
        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
       
        // verify a vote on the first proposal
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals1,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        );
        
        // check that the vote nullifier is stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);

        // check the intial values of the quorum parameters:
        const quorumParamsInitial = await voteManager.connect(governor).getQuorumParams();
        expect(quorumParamsInitial.minQuorumPercent).to.equal(25);
        expect(quorumParamsInitial.maxQuorumPercent).to.equal(50);
        expect(quorumParamsInitial.maxGroupSizeForMinQuorum).to.equal(200);
        expect(quorumParamsInitial.minGroupSizeForMaxQuorum).to.equal(30);

        // set the quorum parameters to a different value:
        await voteManager.connect(governor).setQuorumParams(30, 40, 150, 10);

        // check that the quorum parameters are stored correctly
        const quorumParams = await voteManager.connect(governor).getQuorumParams();
        expect(quorumParams.minQuorumPercent).to.equal(30);
        expect(quorumParams.maxQuorumPercent).to.equal(40);
        expect(quorumParams.maxGroupSizeForMinQuorum).to.equal(150);
        expect(quorumParams.minGroupSizeForMaxQuorum).to.equal(10);

        // get the current proxy address and implementation address
        const proxyAddress = await voteManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the vote manager contract to a new version
        const VoteManagerV2 = await ethers.getContractFactory("MockVoteManagerV2", { signer: governor });
        const voteManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            VoteManagerV2, 
            {
                kind: "uups"
            }
        );
        await voteManagerV2.waitForDeployment();
        const upgradedAddress = await voteManagerV2.target;

        // Check if the vote nullifier is still stored correctly after the upgrade
        expect(await voteManagerV2.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);

        // check that the quorum parameters are still stored correctly after the upgrade
        const updatedQuorumParams = await voteManagerV2.connect(governor).getQuorumParams();
        expect(updatedQuorumParams.minQuorumPercent).to.equal(30);
        expect(updatedQuorumParams.maxQuorumPercent).to.equal(40);
        expect(updatedQuorumParams.maxGroupSizeForMinQuorum).to.equal(150);
        expect(updatedQuorumParams.minGroupSizeForMaxQuorum).to.equal(10);
    });

    it(`FUNCTION: getGroupParams
        TESTING: onlyOwner authorization (success), stored param data
        EXPECTED: should allow the governor to get group parameters`, async function () {
        
        // check the group parameters of an unitiialized group
        const params = await voteManager.connect(governor).getGroupParams(groupKey);
        expect(params.memberCount).to.equal(0);
        expect(params.quorum).to.equal(0);
        
        // check the group parameters of an initialized group
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await voteManager.connect(governor).setMemberCount(groupKey, 1);

        const updatedParams = await voteManager.connect(governor).getGroupParams(groupKey);
        expect(updatedParams.memberCount).to.equal(1);
        expect(updatedParams.quorum).to.equal(50);
    });

    it(`FUNCTION: getGroupParams
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-governor to get group parameters`, async function () {
        await expect(voteManager.connect(user1).getGroupParams(groupKey)).to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setMemberCount, _setQuorum, getGroupParams
        TESTING: stored data: quorum via linear interpolation (group size 31 -> 199)
        EXPECTED: should calculate and set the correct quorum value for a given group size`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
       
            
        let xValues = [];
        let expectedQuorumValues = [];
        let quorumValues = [];
        let expectedMemberCountValues = [];
        for (i = 31; i < 201; i++ ) {
            xValues.push(i);

            // calculate the expected quorum value via linear interpolation
            const interpolatedValue = await linearInterpolation(i);
            expectedQuorumValues.push(Number(interpolatedValue));

            // set the member count and get the group parameters
            await voteManager.connect(governor).setMemberCount(groupKey, i);
            const params = await voteManager.connect(governor).getGroupParams(groupKey);
            quorumValues.push(params.quorum);
            expectedMemberCountValues.push(params.memberCount);
        }

        const diff = expectedQuorumValues.map((expected, index) => {
            const actual = quorumValues[index];
            return Number(expected) - Number(actual);
        });
        //console.log("min difference:", Math.min(...diff));
        //console.log("max difference:", Math.max(...diff));
        expect(diff.every(d => d === 0), `Quorum values do not match expected values for group sizes 31 to 199. Differences: ${diff}`);
        expect(quorumValues).to.deep.equal(expectedQuorumValues, `Quorum values do not match expected values for group sizes 31 to 199`);
        expect(xValues).to.deep.equal(expectedMemberCountValues, `Member count values do not match expected values for group sizes 31 to 199`);
        
        // Calculate the min and max quorum values
        const quorumValuesNumbers = quorumValues.map(q => Number(q));
        minCalculatedQuorum = Math.min(...quorumValuesNumbers);
        maxCalculatedQuorum = Math.max(...quorumValuesNumbers);
        
        // Check that the min and max quorum values are within the expected range
        expect(minCalculatedQuorum).to.be.greaterThanOrEqual(25, `Min quorum value should be >= 25 for group sizes 31 to 199`);
        expect(maxCalculatedQuorum).to.be.lessThanOrEqual(50, `Max quorum value should be <= 50 for group sizes 31 to 199`);
    });

    it(`FUNCTION: setMemberCount, _setQuorum, getGroupParams
        TESTING: stored data: quorum for group size <= 30 or group size >= 200
        EXPECTED: should set the max quorum value for a small group and the min quorum value for a large group`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
       
        // check the quorum values for group sizes 1 to 30 and 200 to 1024
        for (i = 1; i < 31; i++ ) {
            await voteManager.connect(governor).setMemberCount(groupKey, i);
            const params = await voteManager.connect(governor).getGroupParams(groupKey);
            expect(params.quorum).to.equal(50);
            expect(params.memberCount).to.equal(i);
        }

        for (i = 200; i < 1025; i++ ) {
            await voteManager.connect(governor).setMemberCount(groupKey, i);
            const params = await voteManager.connect(governor).getGroupParams(groupKey);
            expect(params.quorum).to.equal(25);
            expect(params.memberCount).to.equal(i);
        }
        
    });

    it(`FUNCTION: setMemberCount, _setQuorum
        TESTING: event: MemberCountSet, QuorumSet
        EXPECTED: should emit MemberCountSet and QuorumSet events when setting a new group member count`, async function () {

        // check the group parameters of an initialized group
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        const newMemberCount = 31; 
        const expectedQuorum = await linearInterpolation(newMemberCount);

        expect(await voteManager.connect(governor).setMemberCount(groupKey, newMemberCount))
            .to.emit(voteManager, "MemberCountSet").withArgs(groupKey, newMemberCount)
            .to.emit(voteManager, "QuorumSet").withArgs(groupKey, expectedQuorum);
    });

    it(`FUNCTION: setMemberCount, _setQuorum, getGroupParams
        TESTING: custom error: InvalidMemberCount
        EXPECTED: should not allow the governor to set the group size to 0 or > 1024`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        await expect(voteManager.connect(governor).setMemberCount(groupKey, 0)).to.be.revertedWithCustomError(
            voteManager,
            "InvalidMemberCount"
        );

        await expect(voteManager.connect(governor).setMemberCount(groupKey, 1025)).to.be.revertedWithCustomError(
            voteManager,
            "InvalidMemberCount"
        );
    });

    it(`FUNCTION: setQuorumParams
        TESTING: onlyOwner authorization (success), stored data, event: QuorumParamsSet
        EXPECTED: should allow the governor to set the quorum parameters`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the quorum parameters
        const newQuorumParams = {
            minQuorumPercent: 30,
            maxQuorumPercent: 40,
            maxGroupSizeForMinQuorum: 100,
            minGroupSizeForMaxQuorum: 20
        };

        expect(await voteManager.connect(governor).setQuorumParams(
            newQuorumParams.minQuorumPercent,
            newQuorumParams.maxQuorumPercent,
            newQuorumParams.maxGroupSizeForMinQuorum,
            newQuorumParams.minGroupSizeForMaxQuorum
        )).to.emit(voteManager, "QuorumParamsSet").withArgs(
            newQuorumParams.minQuorumPercent,
            newQuorumParams.maxQuorumPercent,
            newQuorumParams.maxGroupSizeForMinQuorum,
            newQuorumParams.minGroupSizeForMaxQuorum
        );

        // get the quorum parameters and check if they were set correctly
        const quorumParams = await voteManager.connect(governor).getQuorumParams();
        expect(quorumParams.minQuorumPercent).to.equal(newQuorumParams.minQuorumPercent);
        expect(quorumParams.maxQuorumPercent).to.equal(newQuorumParams.maxQuorumPercent);
        expect(quorumParams.maxGroupSizeForMinQuorum).to.equal(newQuorumParams.maxGroupSizeForMinQuorum);
        expect(quorumParams.minGroupSizeForMaxQuorum).to.equal(newQuorumParams.minGroupSizeForMaxQuorum);
    });

    it(`FUNCTION: setQuorumParams
        TESTING: custom error: InvalidQuorumParams, InvalidGroupSizeParams
        EXPECTED: should not allow the governor to set invalid quorum parameters`, async function () {
        
        const invalidMinQuorumPercent = 20;
        const invalidMaxQuorumPercent = 60;
        const invalidMaxGroupSizeForMinQuorum = 1025;
        const invalidMinGroupSizeForMaxQuorum = 3;
        
        const quorumParams = {
            minQuorumPercent: 25,
            maxQuorumPercent: 50,
            maxGroupSizeForMinQuorum: 200,
            minGroupSizeForMaxQuorum: 30
        };

        await expect(voteManager.connect(governor).setQuorumParams(
            invalidMinQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidQuorumParams"
        );

        await expect(voteManager.connect(governor).setQuorumParams(
            quorumParams.minQuorumPercent,
            invalidMaxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidQuorumParams"
        );

        await expect(voteManager.connect(governor).setQuorumParams(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            invalidMaxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidGroupSizeParams"
        );

        await expect(voteManager.connect(governor).setQuorumParams(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            invalidMinGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidGroupSizeParams"
        );
    });

    it(`FUNCTION: setQuorumParams
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-governor to set quorum parameters`, async function () {
        const quorumParams = {
            minQuorumPercent: 25,
            maxQuorumPercent: 50,
            maxGroupSizeForMinQuorum: 200,
            minGroupSizeForMaxQuorum: 30
        };
        await expect(voteManager.connect(user1).setQuorumParams(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: setVoteVerifier
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to set the vote verifier to the zero address`, async function () {
        await expect(voteManager.connect(governor).setVoteVerifier(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(voteManager, "AddressCannotBeZero");
    });
    
    it(`FUNCTION: setVoteVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to set the vote verifier`, async function () {
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
        expect(await voteManager.connect(governor).getVoteVerifier()).to.equal(mockVoteVerifier.target);
    });
    
    it(`FUNCTION: setVoteVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to set the vote verifier`, async function () {
        await expect(voteManager.connect(user1).setVoteVerifier(mockVoteVerifier.target))
            .to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setVoteVerifier
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the governor to set the vote verifier to an address that is not a contract`, async function () {
        await expect(voteManager.connect(governor).setVoteVerifier(user1.address))
            .to.be.revertedWithCustomError(voteManager, "AddressIsNotAContract");
    });

    it(`FUNCTION: verifyVote
        TESTING: onlyOwner authorization (success), stored data: vote nullifier, event: VoteVerified
        EXPECTED: should allow the governor to verify two different votes on the same proposal and emit event`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);
       
        // set the vote verifier to the mock verifier
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
       
        // verify a vote on the first proposal
        expect(await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals1,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.emit(voteManager, "VoteVerified").withArgs(
            voteContextKey,
            voteNullifier1,
            voteChoiceNo,
            groupKey,
            rootHash1
        );

        // check that the vote nullifier is stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);

        // verify a second vote on the same context with a different choice
        expect(await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals2,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.emit(voteManager, "VoteVerified").withArgs(
            voteContextKey,
            voteNullifier2,
            voteChoiceYes,
            groupKey,
            rootHash1
        );

        // check that the second vote nullifier is stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier2)).to.equal(true);

        // check that the first vote nullifier is still stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);
    });

    it(`FUNCTION: verifyVote
        TESTING: custom error: TallyingInconsistent
        EXPECTED: should not allow the governor to verify a vote if the vote count exceeds the group member count`, async function () {
        
         // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the member count to 1 (ie., only one member can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 1);
        
        // set the proposal submission verifier to the mock verifier and verify a proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);
       
        // set vote verifier to the mock verifier and verify the first vote on the proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockVotePublicSignals1, voteContextKey, groupKey, rootHash1);
        
        // verify a second vote on the same context with a different choice
        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals2,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "TallyingInconsistent");
    });

    it(`FUNCTION: verifyVote
        TESTING: stored data: vote tally, passed status
        EXPECTED: should store the correct tally and passed status after verifying 4 votes`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 4 (ie., only four members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 4);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);

        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockVotePublicSignals1, voteContextKey, groupKey, rootHash1);

        const proposalResult = await voteManager.connect(governor).getProposalResult(voteContextKey);
        expect(proposalResult.tally).to.deep.equal([1, 0, 0]);
        expect(proposalResult.passed).to.equal(false);

        // verify a second vote on the same context with a different choice
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals2,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        );

        const proposalResult2 = await voteManager.connect(governor).getProposalResult(voteContextKey);
        expect(proposalResult2.tally).to.deep.equal([1, 1, 0]);
        expect(proposalResult2.passed).to.equal(false);

        // verify a third vote on the same context with a different choice
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals3,
            voteContextKey, 
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        );

        const proposalResult3 = await voteManager.connect(governor).getProposalResult(voteContextKey);
        expect(proposalResult3.tally).to.deep.equal([1, 1, 1]);
        expect(proposalResult3.passed).to.equal(false);

        // verify a fourth vote on the same context with a yes choice
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals4,
            voteContextKey, 
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        );

        const proposalResult4 = await voteManager.connect(governor).getProposalResult(voteContextKey);
        expect(proposalResult4.tally).to.deep.equal([1, 2, 1]);
        expect(proposalResult4.passed).to.equal(true);

    });

    it(`FUNCTION: verifyVote
        TESTING: stored data: vote tally, passed status
        EXPECTED: should not mark a proposal as passed if it has yes majority but has not reached quorum`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 4 (ie., only 4 members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 4);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);

        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockVotePublicSignals2, voteContextKey, groupKey, rootHash1);

        const proposalResult = await voteManager.connect(governor).getProposalResult(voteContextKey);
        expect(proposalResult.tally).to.deep.equal([0, 1, 0 ]);
        expect(proposalResult.passed).to.equal(false);
    });

    it(`FUNCTION: verifyVote
        TESTING: event: VoteTallyUpdated
        EXPECTED: should emit VoteTallyUpdated event with the correct parameters after verifying a vote`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 4 (ie., only four members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 4);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);

        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockVotePublicSignals1, voteContextKey, groupKey, rootHash1);

        // verify a second vote and check the emitted event
        const tx = await voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals2,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        );
        const receipt = await tx.wait();

        // get emitted events from the logs
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = voteManager.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const VoteTallyUpdatedEvent = parsedEvents.filter((event) => event && event.name === "VoteTallyUpdated");

        // should have emitted 1 VoteTallyUpdated event
        const numEvents = VoteTallyUpdatedEvent.length;
        expect(numEvents).to.equal(1, "Should have emitted 1 VoteTallyUpdated event");

        const event = VoteTallyUpdatedEvent[0];
        const eventVoteTally = event.args[1].map(t => Number(t));
        const expectedVoteTally = [1, 1, 0];

        expect(eventVoteTally).to.deep.equal(expectedVoteTally, "Vote tally in event should match expected tally after second vote");
        expect(event.args[0]).to.equal(voteContextKey, "Context key in event should match expected context key");

    });

    it(`FUNCTION: verifyVote
        TESTING: custom error: RootNotYetInitialized
        EXPECTED: should not allow the governor to verify a vote if the group root has not been initialized`, async function () {
    
        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        // set the vote verifier to the mock verifier
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);

        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals1,
            voteContextKey,
            groupKey,
            ethers.ZeroHash,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "RootNotYetInitialized");
    })

    it(`FUNCTION: verifyVote
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a vote if the merkle root is not valid`, async function () {
        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        // set the vote verifier to the mock verifier
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);

        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals1,
            voteContextKey,
            groupKey,
            rootHash2,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "InvalidMerkleRoot");
    })

    it(`FUNCTION: verifyVote
        TESTING: custom error: VoteNullifierAlreadyUsed
        EXPECTED: should not allow the governor to verify a vote if the vote nullifier has already been used`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        // set the vote verifier to the mock verifier
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockVotePublicSignals1, voteContextKey, groupKey, rootHash1);

        await expect(voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1))
            .to.eventually.equal(true, "Vote nullifier should be stored after first verification");
        
        // verify a second vote with the same nullifier
        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals1,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "VoteNullifierAlreadyUsed");

        // verify another vote with a different nullifier
        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals2,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.emit(voteManager, "VoteVerified").withArgs(
            voteContextKey,
            voteNullifier2);

        await expect(voteManager.connect(governor).getVoteNullifierStatus(voteNullifier2))
            .to.eventually.equal(true, "Second vote nullifier should be stored after second verification");
        
        // check that the first vote nullifier is still stored correctly
        await expect(voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1))
            .to.eventually.equal(true, "First vote nullifier should still be stored after second verification");

        // verify another vote with the same nullifier as in publicSignals2
        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals2,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "VoteNullifierAlreadyUsed");

    })

    it(`FUNCTION: verifyVote
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a vote if the context hash is invalid`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        // set the vote verifier to the mock verifier
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
        
        const invalidContextHash = Conversions.stringToBytes32("invalidContextHash");
        
        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockVotePublicSignals1,
            invalidContextHash,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "InvalidContextHash");

    })

    it(`FUNCTION: verifyVote
        TESTING: custom error: InvalidVoteChoice
        EXPECTED: should not allow the governor to verify a vote if the vote choice is invalid`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        // set the vote verifier to the mock verifier
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);

        const invalidPublicSignals = [
            voteContextKey,
            voteNullifier1,
            Conversions.stringToBigInt("invalidVoteChoice"), 
            rootHash1,
            submissionNullifier1
        ];

        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            invalidPublicSignals,
            voteContextKey,
            groupKey,
            rootHash1,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "InvalidVoteChoice");

    })

    it(`FUNCTION: verifyVote (with real verifier and invalid proof)
        TESTING: custom error: InvalidVoteProof
        EXPECTED: should not allow the governor to verify a vote if the vote proof is invalid`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            realVotePublicSignals,
            realVoteContextKey,
            realGroupKey,
            realRoot,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "InvalidVoteProof");

    });

    it(`FUNCTION: verifyVote (with real verifier)
        TESTING: custom error: InvalidVoteProof
        EXPECTED: should not allow the governor to verify a vote if the vote choice is invalid`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);
        
        // make a copy of the valid public signals
        const invalidPublicSignals = [...realVotePublicSignals];
        
        // modify the vote choice to an invalid value
        invalidPublicSignals[2] = voteChoiceAbstain;
        
        // reverts with InvalidVoteProof instead of InvalidVoteChoice as the vote choice is bound to the proof
        await expect(
            voteManager.connect(governor).verifyVote(
                realVoteProof,
                invalidPublicSignals,
                realVoteContextKey,
                realGroupKey,
                realRoot,
                true // isProposalSubmitted
            )
        ).to.be.revertedWithCustomError(voteManager, "InvalidVoteProof");

    });

    it(`FUNCTION: verifyVote (with real verifier)
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a vote if the context hash is invalid`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);
        
        // make a copy of the valid public signals
        const invalidPublicSignals = [...realVotePublicSignals];

        // modify the vote choice to an invalid value
        invalidPublicSignals[0] = Conversions.stringToBigInt("InvalidContextHash");

        await expect(voteManager.connect(governor).verifyVote(
            realVoteProof,
            invalidPublicSignals,
            realVoteContextKey,
            realGroupKey,
            realRoot,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "InvalidContextHash");

    });

    it(`FUNCTION: verifyVote (with real verifier)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a vote if the Merkle root is invalid`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);
        
        // make a copy of the valid public signals
        const invalidPublicSignals = [...realVotePublicSignals];

        // modify the vote choice to an invalid value
        invalidPublicSignals[3] = Conversions.stringToBigInt("InvalidMerkleRoot");

        await expect(voteManager.connect(governor).verifyVote(
            realVoteProof,
            invalidPublicSignals,
            realVoteContextKey,
            realGroupKey,
            realRoot,
            true // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "InvalidMerkleRoot");

    });

    it(`FUNCTION: verifyVote (with real verifier)
        TESTING: custom error: VoteNullifierAlreadyUsed
        EXPECTED: should not allow the governor to verify a vote if the vote nullifier is already used`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(realGroupKey, 2);

        await expect(voteManager.connect(governor).verifyVote(
            realVoteProof,
            realVotePublicSignals,
            realVoteContextKey,
            realGroupKey,
            realRoot,
            true // isProposalSubmitted
        )).to.emit(voteManager, "VoteVerified");

        const nullifier = ethers.toBeHex(realVotePublicSignals[1], 32);
        expect(await voteManager.connect(governor).getVoteNullifierStatus(nullifier))
            .to.equal(true, "Vote nullifier should be stored after first verification");

        await expect(voteManager.connect(governor).verifyVote(
            realVoteProof,
            realVotePublicSignals,
            realVoteContextKey,
            realGroupKey,
            realRoot,
            true // isProposalSubmitted
        )).to.revertedWithCustomError(voteManager, "VoteNullifierAlreadyUsed");
    });

    it(`FUNCTION: verifyVote (with real verifier)
        TESTING: custom error: ProposalHasNotBeenSubmitted
        EXPECTED: should not allow the governor to verify a vote if the proposal has not been submitted`, async function () {

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);

        await expect(voteManager.connect(governor).verifyVote(
            realVoteProof,
            realVotePublicSignals,
            realVoteContextKey,
            realGroupKey,
            realRoot,
            false // isProposalSubmitted
        )).to.be.revertedWithCustomError(voteManager, "ProposalHasNotBeenSubmitted");

    });

    it(`FUNCTION: getVoteVerifier
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-governor to get the current vote verifier address`, async function () {

        await expect(voteManager.connect(user1).getVoteVerifier()).to.be.revertedWithCustomError(
            voteManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: getProposalResult
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-governor to get the current proposal result`, async function () {

        await expect(voteManager.connect(user1).getProposalResult(voteContextKey)).to.be.revertedWithCustomError(
            voteManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: getQuorumParams
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-governor to get the current quorum parameters`, async function () {

        await expect(voteManager.connect(user1).getQuorumParams()).to.be.revertedWithCustomError(
            voteManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: getContractVersion
        TESTING: authorization (success)
        EXPECTED: should allow the governor to get the current contract version`, async function () {

        expect(await voteManager.connect(governor).getContractVersion()).to.equal("VoteManager v1.0.0");
    });

    
});
