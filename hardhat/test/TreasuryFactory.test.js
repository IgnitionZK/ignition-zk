const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");

describe("Treasury Factory Unit Tests:", function () {

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

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy TreasuryManager, TreasuryFactory, BeaconManager contracts`, async function () {
        expect(await treasuryManager.target).to.be.properAddress;
        expect(await treasuryFactory.target).to.be.properAddress;
        expect(await beaconManager.target).to.be.properAddress;
    });

    it(`SET UP: stored contract addresses
        TESTING: beacon, grantModule addresses
        EXPECTED: should store the correct beacon manager and grant module address`, async function () {
        expect(await treasuryFactory.connect(governor).getBeaconManager()).to.equal(beaconManager.target);
        expect(await treasuryFactory.connect(governor).getGrantModule()).to.equal(grantModule.target);
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner of the TreasuryFactory`, async function () {
        expect(await treasuryFactory.owner()).to.equal(await governor.getAddress());
        expect(await treasuryFactory.connect(governor).getGovernanceManager()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the deployer as the temporary owner of the BeaconManager`, async function () {
        expect(await beaconManager.owner()).to.equal(await deployer.getAddress());
    });

    it(`FUNCTION: deployTreasury
        TESTING: event: TreasuryDeployed
        EXPECTED: should allow the governor to deploy a treasury instance and emit event`, async function () {
    
        // Deploy Treasury
        await expect(
            treasuryFactory.connect(governor).deployTreasury(
                groupKey, 
                true, // hasDeployedNft
                await governor.getAddress() // treasuryOwner
            )
        ).to.emit(
            treasuryFactory, 
            "TreasuryDeployed");
    });
    
    it(`FUNCTION: deployTreasury
        TESTING: mapping: groupTreasuryAddresses
        EXPECTED: should correctly store the addresses of the deployed treasury instances`, async function () {
    
        // Deploy Treasury instance for group with groupKey
        const tx = await treasuryFactory.connect(governor).deployTreasury(
                groupKey, 
                true, // hasDeployedNft
                await governor.getAddress() // treasuryOwner
        );
        const receipt = await tx.wait();

        // get deployed address from the event logs:
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = treasuryFactory.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const TreasuryDeployedEvent = parsedEvents.filter((event) => event && event.name === "TreasuryDeployed");
        const deployedTreasuryAddress = TreasuryDeployedEvent[0].args[1];  
        
        // Get the stored address from the mapping
        const storedTreasuryAddress = await treasuryFactory.connect(governor).getTreasuryAddress(groupKey);

        // check that the addresses match
        expect(deployedTreasuryAddress).to.equal(storedTreasuryAddress);

        // Deploy Treasury instance for group with groupKey2
        const tx2 = await treasuryFactory.connect(governor).deployTreasury(
                groupKey2, 
                true, // hasDeployedNft
                await governor.getAddress() // treasuryOwner
        );
        const receipt2 = await tx2.wait();

        // get deployed address from the event logs:
        const parsedEvents2 = [];
        for (const log of receipt2.logs) {
            try {
                const parsedLog = treasuryFactory.interface.parseLog(log);
                parsedEvents2.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const TreasuryDeployedEvent2 = parsedEvents2.filter((event) => event && event.name === "TreasuryDeployed");
        const deployedTreasuryAddress2 = TreasuryDeployedEvent2[0].args[1];

        // Get the stored address from the mapping
        const storedTreasuryAddress2 = await treasuryFactory.connect(governor).getTreasuryAddress(groupKey2);

        // check that the addresses match
        expect(deployedTreasuryAddress2).to.equal(storedTreasuryAddress2);

        // Check that the new treasury address is different
        expect(storedTreasuryAddress2).to.not.equal(storedTreasuryAddress);

        // Check that the first treasury address (groupKey) is still the same
        expect(storedTreasuryAddress).to.equal(await treasuryFactory.connect(governor).getTreasuryAddress(groupKey));
    });

    it(`FUNCTION: deployTreasury
        TESTING: authorization (failure)
        EXPECTED: should not let the non-owner to deploy a treasury instance`, async function () {

        // Attempt to deploy Treasury as non-owner
        await expect(
            treasuryFactory.connect(user1).deployTreasury(
                groupKey,
                true, // hasDeployedNft
                await governor.getAddress() // treasuryOwner
            )
        ).to.be.revertedWithCustomError(
            treasuryFactory, 
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: custom error: GroupTreasuryAlreadyExists
        EXPECTED: should not let the owner to deploy a treasury instance for a group with an existing treasury`, async function () {
        // Deploy first treasury instance
        await treasuryFactory.connect(governor).deployTreasury(groupKey, true, await governor.getAddress()); 
        // Attempt to deploy a second treasury instance for the same group
        await expect(
            treasuryFactory.connect(governor).deployTreasury(groupKey, true, await governor.getAddress())
        ).to.be.revertedWithCustomError(
            treasuryFactory,
            "GroupTreasuryAlreadyExists"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not let the owner to deploy a treasury instance for a group without an NFT`, async function () {
        await expect(
            treasuryFactory.connect(governor).deployTreasury(
                groupKey, 
                false, // hasDeployedNft
                await governor.getAddress() // treasuryOwner
            )
        ).to.be.revertedWithCustomError(
            treasuryFactory,
            "GroupNftNotSet"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: initial owner of the treasury
        EXPECTED: should set the correct initial treasury owners`, async function () {
        
    
    });






});