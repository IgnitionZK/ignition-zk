const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");

describe("Proposal Manager Unit Tests:", function () {

    let fixtures;
    
    // RUN ONCE BEFORE ALL TESTS
    before(async function () {

        fixtures = await setUpFixtures();
        ({
            // Signers
            governor, user1, deployer, relayer,

            // Test constants
            groupKey, groupKey2, epochKey, proposalKey, 
            voteContextKey, proposalContextKey,
            rootHash1, rootHash2,
            voteNullifier1, voteNullifier2, voteNullifier3, voteNullifier4,
            submissionNullifier1, submissionNullifier2,
            claimNullifier1, claimNullifier2,
            contentHash1, contentHash2,
            voteChoiceNo, voteChoiceYes, voteChoiceAbstain,
            nftName, nftSymbol, nftName2, nftSymbol2,
            mockProof, mockVotePublicSignals1, mockVotePublicSignals2, mockVotePublicSignals3, mockVotePublicSignals4,
            mockProposalPublicSignals1, mockProposalPublicSignals2, mockClaimPublicSignals1, mockClaimPublicSignals2,
            realGroupId, realEpochId, realProposalId, 
            realGroupKey, realEpochKey, realProposalKey, 
            realProposalContextKey, realVoteContextKey, realRoot, 
            realVoteProof, realVotePublicSignals, voteProofContextHash, voteProofNullifier, voteProofChoice, voteProofRoot, voteProofSubmissionNullifier,
            realProposalProof, realProposalPublicSignals, proposalProofContextHash, proposalProofSubmissionNullifier, proposalProofClaimNullifier, proposalProofRoot, proposalProofContentHash,
            realClaimProof, realClaimPublicSignals
        } = fixtures);
    });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {
    
        const deployedFixtures = await deployFixtures();

        ({
            membershipManager, proposalManager, voteManager, governanceManager, nftImplementation,
            membershipVerifier, proposalVerifier, proposalClaimVerifier, voteVerifier,
            mockMembershipVerifier, mockProposalVerifier, mockProposalClaimVerifier, mockVoteVerifier
        } = deployedFixtures);
    });
    
    async function deployGroupNftAndSetRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).setRoot(root, group);
    }

    async function setSubmissionVerifierAndVerifyProposal(signer, verifier, proof, publicSignals, contextKey, groupKey) {
        // Set the proposal submission verifier
        await proposalManager.connect(signer).setProposalSubmissionVerifier(verifier);
        // Verify the proposal
        return await proposalManager.connect(signer).verifyProposal(
            proof,
            publicSignals,
            contextKey,
            groupKey
        );
    }

    async function setClaimVerifierAndVerifyClaim(signer, verifier, proof, publicSignals) {
        // Set the proposal claim verifier
        await proposalManager.connect(signer).setProposalClaimVerifier(verifier);
        // Verify the claim
        return await proposalManager.connect(signer).verifyProposalClaim(
            proof,
            publicSignals,
            proposalContextKey
        );
    }

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy Membership Verifier, MembershipManager, ProposalVerifier, ProposalClaimVerifier, ProposalManager contracts`, async function () {
        expect(await membershipManager.target).to.be.properAddress;
        expect(await proposalManager.target).to.be.properAddress;
        expect(await proposalVerifier.target).to.be.properAddress;
        expect(await proposalClaimVerifier.target).to.be.properAddress;
        expect(await nftImplementation.target).to.be.properAddress;
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner of MembershipManager and ProposalManager`, async function () {
        expect(await membershipManager.owner()).to.equal(await governor.getAddress());
        expect(await proposalManager.owner()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: onlyOwner(), transferOwnership()
        EXPECTED: should allow the governor to transfer ownership of the proposal manager`, async function () {
        await proposalManager.connect(governor).transferOwnership(await user1.getAddress());
        expect(await proposalManager.owner()).to.equal(await user1.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  onlyOwner(), transferOwnership()
        EXPECTED: should not allow non-governor to transfer ownership of the proposal manager`, async function () {
        await expect(proposalManager.connect(user1).transferOwnership(await governor.getAddress()))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  error: OwnableInvalidOwner, transferOwnership()
        EXPECTED: should not allow governor to transfer ownership to the zero address`, async function () {
        await expect(proposalManager.connect(governor).transferOwnership(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(proposalManager, "OwnableInvalidOwner");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to upgrade the proposal manager contract`, async function () {

        const proxyAddress = await proposalManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the proposal manager contract to a new version
        const ProposalManagerV2 = await ethers.getContractFactory("MockProposalManagerV2", { signer: governor });
        const proposalManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            ProposalManagerV2, 
            {
                kind: "uups"
            }
        );
        await proposalManagerV2.waitForDeployment();

        const upgradedAddress = await proposalManagerV2.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);

        // Check if the upgrade was successful
        expect(newImplementationAddress).to.be.properAddress;
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it(`FUNCTIONALITY: upgradeability 
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to upgrade the proposal manager contract`, async function () {
        
        const ProposalManagerV2 = await ethers.getContractFactory("MockProposalManagerV2", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            proposalManager.target, 
            ProposalManagerV2, 
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: proxy data storage
        EXPECTED: should preserve proxy data after upgrade`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // check that the submission nullifier is stored correctly
        expect(await proposalManager.submissionNullifiers(submissionNullifier1)).to.equal(true);

        // get the current proxy address and implementation address
        const proxyAddress = await proposalManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the proposal manager contract to a new version
        const ProposalManagerV2 = await ethers.getContractFactory("MockProposalManagerV2", { signer: governor });
        const proposalManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            ProposalManagerV2, 
            {
                kind: "uups"
            }
        );
        await proposalManagerV2.waitForDeployment();

        const upgradedAddress = await proposalManagerV2.target;
        
        // Check if the submission nullifier is still stored correctly after the upgrade
        expect(await proposalManagerV2.submissionNullifiers(submissionNullifier1)).to.equal(true);

    });

    it(`FUNCTION: setProposalSubmissionVerifier
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to set the proposal submission verifier to the zero address`, async function () {
        await expect(proposalManager.connect(governor).setProposalSubmissionVerifier(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(proposalManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: setProposalSubmissionVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to set the proposal submission verifier`, async function () {
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        expect(await proposalManager.submissionVerifier()).to.equal(mockProposalVerifier.target);
    });

    it(`FUNCTION: setProposalSubmissionVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to set the proposal submission verifier`, async function () {
        await expect(proposalManager.connect(user1).setProposalSubmissionVerifier(mockProposalVerifier.target))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setProposalSubmissionVerifier
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the governor to set the submission verifier to an address that is not a contract`, async function () {
        await expect(proposalManager.connect(governor).setProposalSubmissionVerifier(user1.address))
            .to.be.revertedWithCustomError(proposalManager, "AddressIsNotAContract");
    });

    it(`FUNCTION: setProposalClaimVerifier
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to set the proposal claim verifier to the zero address`, async function () {
        await expect(proposalManager.connect(governor).setProposalClaimVerifier(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(proposalManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: setProposalClaimVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to set the proposal claim verifier`, async function () {
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        expect(await proposalManager.claimVerifier()).to.equal(mockProposalClaimVerifier.target);
    });

    it(`FUNCTION: setProposalClaimVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to set the proposal claim verifier`, async function () {
        await expect(proposalManager.connect(user1).setProposalClaimVerifier(mockProposalClaimVerifier.target))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

     it(`FUNCTION: setProposalClaimVerifier
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the governor to set the claim verifier to an address that is not a contract`, async function () {
        await expect(proposalManager.connect(governor).setProposalClaimVerifier(user1.address))
            .to.be.revertedWithCustomError(proposalManager, "AddressIsNotAContract");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: event: SubmissionVerified, mapping: submissionNullifier
        EXPECTED: should store two submission nullifiers after verifying two different proposals`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        const tx = await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // expect the event to be emitted with the correct arguments
        await expect(tx).to.emit(proposalManager, "SubmissionVerified").withArgs(proposalContextKey, submissionNullifier1, claimNullifier1, contentHash1);

        // check if the submission nullifier status is stored correctly
        expect(await proposalManager.submissionNullifiers(submissionNullifier1)).to.equal(true);

        // set a new root for the group key
        await membershipManager.connect(governor).setRoot(rootHash2, groupKey);

        // verify the second proposal with a different root and submission nullifier
        const tx2 = await proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals2,
            proposalContextKey,
            groupKey
        );

        // expect the event to be emitted with the correct arguments
        await expect(tx2).to.emit(proposalManager, "SubmissionVerified").withArgs(proposalContextKey, submissionNullifier2, claimNullifier2, contentHash2);
        
        // check if the submission nullifier status is stored correctly
        expect(await proposalManager.submissionNullifiers(submissionNullifier2)).to.equal(true);
        
        // check if the first submission nullifier is still valid
        expect(await proposalManager.submissionNullifiers(submissionNullifier1)).to.equal(true);
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: SubmissionNullifierAlreadyUsed
        EXPECTED: should not allow the governor to verify a proposal with a used submission nullifier`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // try to verify the same proposal again with the same submission nullifier
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            proposalContextKey,
            groupKey
        )).to.be.revertedWithCustomError(proposalManager, "SubmissionNullifierAlreadyUsed");
    });

    it(`FUNCTION verifyProposal (with mock submission verifier): 
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proposal with an invalid context key`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            Conversions.stringToBytes32("invalidContextKey"), 
            groupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a proposal with a root different than the current root`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployGroupNftAndSetRoot(governor, groupKey2, nftName2, nftSymbol2, rootHash2);

        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            proposalContextKey,
            groupKey2
        )).to.be.revertedWithCustomError(proposalManager, "InvalidMerkleRoot");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: RootNotYetInitialized
        EXPETED: should not allow the governor to verify a proposal with a non-initialized root`, async function () {
        
        // deploy group NFT without initializing the root
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            proposalContextKey,
            ethers.ZeroHash
        )).to.be.revertedWithCustomError(proposalManager, "RootNotYetInitialized");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: onlyOwner authorization
        EXPECTED: should not allow non-governor to verify a proposal`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(user1).verifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            proposalContextKey,
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not let governor verify a proposal with an invalid proof`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        // set the mock submission verifier to return an invalid proof
        await mockProposalVerifier.connect(governor).setIsValid(false);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            proposalContextKey,
            groupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(proposalContextKey, submissionNullifier1);
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: SubmissionNullifierAlreadyUsed, Cross-context nullifier conflict
        EXPECTED: should not allow the governor to verify a proposal with a submission nullifier already used in another context`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        const publicSignals = [
            Conversions.stringToBytes32("contextKey2"),
            submissionNullifier1,
            claimNullifier2,
            rootHash1, 
            contentHash2
        ];

        // verify a different proposal with a different context key but the same submission nullifier
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            publicSignals,
            Conversions.stringToBytes32("contextKey2"),
            groupKey
        )).to.be.revertedWithCustomError(proposalManager, "SubmissionNullifierAlreadyUsed");
    });

    it(`FUNCTION: verifyProposal (with real verifier, mock proof)
        TESTING: zero proof inputs handling
        EXPECTED: should not allow the governor to verify a proposal with a zero proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        const zeroProof = new Array(24).fill(0);

        await expect(proposalManager.connect(governor).verifyProposal(
            zeroProof,
            mockProposalPublicSignals1,
            proposalContextKey,
            groupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(proposalContextKey, submissionNullifier1);
    });

    it(`FUNCTION: verifyProposal (with real verifier & real proof)
        TESTING: event: SubmissionVerified, stored data: submissionNullifier
        EXPECTED: should allow the governor to verify a proposal with a valid proof`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await expect(proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            realProposalPublicSignals,
            realProposalContextKey,
            realGroupKey
        )).to.emit(proposalManager, "SubmissionVerified").withArgs(
            proposalProofContextHash,
            proposalProofSubmissionNullifier,
            proposalProofClaimNullifier,
            proposalProofContentHash
        );

        const submissionNullifierStatus = await proposalManager.submissionNullifiers(proposalProofSubmissionNullifier);
        expect(submissionNullifierStatus).to.equal(true, "Submission nullifier status should be true after verification");
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid context key in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realProposalPublicSignals];

        // increment the first public signal (context key) to make it invalid
        invalidPublicSignals[0] = invalidPublicSignals[0] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            invalidPublicSignals,
            realProposalContextKey,
            realGroupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid submission nullifier in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realProposalPublicSignals];

        // increment the second public signal (submission nullifier) to make it invalid
        invalidPublicSignals[1] = invalidPublicSignals[1] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            invalidPublicSignals,
            realProposalContextKey,
            realGroupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(
            realProposalContextKey,
            invalidPublicSignals[1]
        );
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid claim nullifier in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realProposalPublicSignals];

        // increment the third public signal (claim nullifier) to make it invalid
        invalidPublicSignals[2] = invalidPublicSignals[2] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            invalidPublicSignals,
            realProposalContextKey,
            realGroupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(
            realProposalContextKey,
            invalidPublicSignals[1]
        );
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid root in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realProposalPublicSignals];

        // increment the 4th public signal (claim nullifier) to make it invalid
        invalidPublicSignals[3] = invalidPublicSignals[3] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            invalidPublicSignals,
            realProposalContextKey,
            realGroupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidMerkleRoot");
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid content hash in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realProposalPublicSignals];

        // increment the 5th public signal (content hash) to make it invalid
        invalidPublicSignals[4] = invalidPublicSignals[4] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            invalidPublicSignals,
            realProposalContextKey,
            realGroupKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(
            realProposalContextKey,
            invalidPublicSignals[1]
        );
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier)
        TESTING: custom error: ProposalHasNotBeenSubmitted
        EXPECTED: should not allow the governor to verify a proposal claim for a non-submitted proposal`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // verify a proposal claim
        await expect(
            proposalManager.connect(governor).verifyProposalClaim(
                mockProof,
                mockClaimPublicSignals1,
                proposalContextKey
            )
        ).to.be.revertedWithCustomError(proposalManager, "ProposalHasNotBeenSubmitted");
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier)
        TESTING: custom error: InvalidContextHash 
        EXPECTED: should not allow the governor to verify a proposal claim with a wrong contextKey`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);

        // verify a proposal claim with a wrong context key
        await expect(
            proposalManager.connect(governor).verifyProposalClaim(
                mockProof,
                mockClaimPublicSignals1,
                Conversions.stringToBytes32("wrongContextKey")
            )
        ).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier)
        TESTING: event: ClaimVerified, stored data: claimNullifier
        EXPECTED: should allow the governor to verify a proposal claim for a submitted proposal`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // verify a proposal claim
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.emit(proposalManager, "ClaimVerified").withArgs(
            proposalContextKey,
            claimNullifier1,
            submissionNullifier1
        );

        const claimNullifierStatus = await proposalManager.claimNullifiers(claimNullifier1);
        expect(claimNullifierStatus).to.equal(true, "Claim nullifier status should be true after verification");
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier) 
        TESTING: custom error: ProposalHasAlreadyBeenClaimed
        EXPECTED: should not allow the governor to verify a proposal claim for a claimed proposal`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // verify a proposal claim
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.emit(proposalManager, "ClaimVerified").withArgs(
            proposalContextKey,
            claimNullifier1,
            submissionNullifier1
        );

        // verify the same proposal claim again
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.be.revertedWithCustomError(proposalManager, "ProposalHasAlreadyBeenClaimed");

    });

    it(`FUNCTION: verifyProposalClaim (with mock submission verifier)
        TESTING: onlyOwner authorization 
        EXPECTED: should not allow non-governor to verify a proposal claim`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target); 
        
        // verify a proposal claim with user1
        await expect(proposalManager.connect(user1).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyProposalClaim (with mock submission verifier)
        TESTING: custom error: InvalidClaimProof
        EXPECTED: should not allow governor to verify a proposal claim with an invalid proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // set the mock proposal claim verifier to return an invalid proof
        await mockProposalClaimVerifier.connect(governor).setIsValid(false);

        // verify a proposal claim with an invalid proof
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidClaimProof");
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier & real proof)
        TESTING: event: ClaimVerified, stored data: claimNullifier
        EXPECTED: should allow the governor to verify a proposal claim with a valid proof`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            realProposalPublicSignals,
            realProposalContextKey,
            realGroupKey
        );

        const submissionNullifierStatus = await proposalManager.submissionNullifiers(proposalProofSubmissionNullifier);
        expect(submissionNullifierStatus).to.equal(true, "Submission nullifier status should be true after verification");

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            realClaimPublicSignals,
            realProposalContextKey
        )).to.emit(proposalManager, "ClaimVerified").withArgs(
            proposalProofContextHash,
            proposalProofClaimNullifier,
            proposalProofSubmissionNullifier
        );

        const claimNullifierStatus = await proposalManager.claimNullifiers(proposalProofClaimNullifier);
        expect(claimNullifierStatus).to.equal(true, "Claim nullifier status should be true after verification");
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier, real proof, invalid public signals)
        TESTING: custom error: InvalidClaimProof
        EXPECTED: should not allow the governor to verify a proposal claim with a valid proof and an invalid claim nullifier in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            realProposalPublicSignals,
            realProposalContextKey,
            realGroupKey
        );

        const invalidClaimPublicSignals = [...realClaimPublicSignals];
        // increment the first public signal (claim nullifier) to make it invalid
        invalidClaimPublicSignals[0] = invalidClaimPublicSignals[0] + BigInt(1);

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            invalidClaimPublicSignals,
            realProposalContextKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidClaimProof").withArgs(
            realProposalContextKey,
            invalidClaimPublicSignals[0],
            proposalProofSubmissionNullifier
        );
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier, real proof, invalid public signals)
        TESTING: custom error: ProposalHasNotBeenSubmitted
        EXPECTED: should not allow the governor to verify a proposal claim with a valid proof and an invalid submission nullifier in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            realProposalPublicSignals,
            realProposalContextKey,
            realGroupKey
        );

        // increment the 2nd public signal (submission nullifier) to make it invalid
        const invalidClaimPublicSignals = [...realClaimPublicSignals];
        invalidClaimPublicSignals[1] = invalidClaimPublicSignals[1] + BigInt(1);

        const submissionNullifier = ethers.toBeHex(invalidClaimPublicSignals[1],32);
        const submissionNullifierStatus = await proposalManager.submissionNullifiers(submissionNullifier);
        expect(submissionNullifierStatus).to.equal(false, "Submission nullifier status should be false for an invalid submission nullifier");

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            invalidClaimPublicSignals,
            realProposalContextKey
        )).to.be.revertedWithCustomError(proposalManager, "ProposalHasNotBeenSubmitted");
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier, real proof, invalid public signals)
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proposal claim with a valid proof and an invalid context hash in the public signals`, async function () {
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProposalProof,
            realProposalPublicSignals,
            realProposalContextKey,
            realGroupKey
        );

        // increment the 3rd public signal (context hash) to make it invalid
        const invalidClaimPublicSignals = [...realClaimPublicSignals];
        invalidClaimPublicSignals[2] = invalidClaimPublicSignals[2] + BigInt(1);

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            invalidClaimPublicSignals,
            realProposalContextKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it(`FUNCTION: claimNullifiers
        TESTING: stored data: claimNullifier
        EXPECTED: should store two claim nullifiers after verifying two different proposal claims`, async function () {
        // deploy group NFT and initialize group root for the first proposal
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockProposalPublicSignals1, proposalContextKey, groupKey);

        // set the proposal claim verifier to the mock verifier and verify the first proposal claim
        await setClaimVerifierAndVerifyClaim(governor, mockProposalClaimVerifier.target, mockProof, mockClaimPublicSignals1);

        // check if the claim nullifier status is stored correctly
        expect(await proposalManager.claimNullifiers(claimNullifier1)).to.equal(true);

        // set a new root for the group key
        await membershipManager.connect(governor).setRoot(rootHash2, groupKey);

        // verify the second proposal
        await proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockProposalPublicSignals2,
            proposalContextKey,
            groupKey
        );

        // verify the second proposal claim
        await proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals2,
            proposalContextKey
        );
        // check if the claim nullifier status is stored correctly
        expect(await proposalManager.claimNullifiers(claimNullifier2)).to.equal(true);
        // check if the first claim nullifier is still valid
        expect(await proposalManager.claimNullifiers(claimNullifier1)).to.equal(true);
    });


});