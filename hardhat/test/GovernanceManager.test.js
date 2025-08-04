const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils");
const { setUpFixtures, deployFixtures } = require("./fixtures");

describe("Governance Manager Unit Tests:", function () {

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
            mockProposalProof, mockProposalPublicSignals1, mockClaimPublicSignals1,
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
            membershipManager, proposalManager, voteManager, governanceManager, nftImplementation,
            membershipVerifier, proposalVerifier, proposalClaimVerifier, voteVerifier,
            mockMembershipVerifier, mockProposalVerifier, mockProposalClaimVerifier, mockVoteVerifier
        } = deployedFixtures);

        // Transfer ownership of MembershipManager to GovernanceManager
        await membershipManager.connect(governor).transferOwnership(governanceManager.target);

        // Tranfer ownership of ProposalManager to GovernanceManager
        await proposalManager.connect(governor).transferOwnership(governanceManager.target);

        // Transfer ownership of VoteManager to GovernanceManager
        await voteManager.connect(governor).transferOwnership(governanceManager.target);
    });

    // Helper functions for testing:
    async function upgradeGovernanceManager() {
        const MockGovernanceManagerV2 = await ethers.getContractFactory("MockGovernanceManagerV2");

        // Upgrade the GovernanceManager contract
        const upgradedGovernanceManager = await upgrades.upgradeProxy(
            governanceManager.target, 
            MockGovernanceManagerV2,
            {
                kind: "uups"
            }
        );
        await upgradedGovernanceManager.waitForDeployment();

        return upgradedGovernanceManager;
    }

    async function deployMockMembershipManagerV2() {
        const MockMembershipManagerV2 = await ethers.getContractFactory("MockMembershipManagerV2");
        const mockMembershipManager = await upgrades.deployProxy(
            MockMembershipManagerV2,
            [
                await deployer.getAddress(), // _initialOwner
                nftImplementation.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await mockMembershipManager.waitForDeployment();
        return mockMembershipManager;
    }

    async function deployMockProposalManagerV2() {
        const MockProposalManagerV2 = await ethers.getContractFactory("MockProposalManagerV2");
        const mockProposalManager = await upgrades.deployProxy(
            MockProposalManagerV2,
            [
                await deployer.getAddress(), // _initialOwner
                proposalVerifier.target,
                proposalClaimVerifier.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await mockProposalManager.waitForDeployment();
        return mockProposalManager;
    }

    async function deployGroupNftAndSetRoot() {
        // Deploy the group NFT and initialize the root
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateSetRoot(rootHash1, groupKey);
    }

    async function setMockSubmissionVerifierAndVerifyProposal() {
        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);

        // Submit a proposal
        await governanceManager.connect(relayer).delegateVerifyProposal(
            mockProof,
            mockProposalPublicSignals1,
            groupKey,
            proposalContextKey
        );
    }

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy MembershipManager, ProposalManager, ProposalVerifier, ProposalClaimVerifier, GovernanceManager`, async function () {
        expect(await membershipManager.target).to.be.properAddress;
        expect(await proposalManager.target).to.be.properAddress;
        expect(await proposalVerifier.target).to.be.properAddress;
        expect(await proposalClaimVerifier.target).to.be.properAddress;
        expect(await governanceManager.target).to.be.properAddress;
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the GovernanceManager as the owner of MembershipManager and ProposalManager`, async function () {
        expect(await membershipManager.owner()).to.equal(governanceManager.target);
        expect(await proposalManager.owner()).to.equal(governanceManager.target);
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the deployer as the initial owner of GovernanceManager`, async function () {
        expect(await governanceManager.owner()).to.equal(await deployer.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: transferOwnership()
        EXPECTED: should allow the owner to transfer ownership of GovernanceManager`, async function () {
        // Transfer ownership from relayer to user1
        await expect(governanceManager.connect(deployer).transferOwnership(await user1.getAddress()))
            .to.emit(governanceManager, "OwnershipTransferred")
            .withArgs(await deployer.getAddress(), await user1.getAddress());

        // Check that the ownership has been transferred
        expect(await governanceManager.owner()).to.equal(await user1.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: transferOwnership()
        EXPECTED: should not allow a non-owner to transfer ownership of GovernanceManager`, async function () {
        await expect(governanceManager.connect(relayer).transferOwnership(await user1.getAddress()))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
    });

    
    it(`ACCESS CONTROL: ownership
        TESTING:  error: OwnableInvalidOwner, transferOwnership()
        EXPECTED: should not allow the owner to transfer ownership to the zero address`, async function () {
        await expect(governanceManager.connect(deployer).transferOwnership(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(governanceManager, "OwnableInvalidOwner");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the owner to upgrade the governance manager contract`, async function () {
        // governance Manager proxy and implementation addresses:
        const governanceManagerAddress = await governanceManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(governanceManagerAddress);
        
        // addresses of upgraded GovernanceManager contract
        const upgradedGovernanceManager = await upgradeGovernanceManager();
        const upgradedAddress = await upgradedGovernanceManager.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);

        // check that the upgrade was successful
        expect(upgradedAddress).to.be.properAddress;
        // check that the proxy address is still the same
        expect(governanceManagerAddress).to.equal(upgradedAddress, "Proxy address should remain the same after upgrade");
        // check that the implementation address has changed
        expect(implementationAddress).to.not.equal(newImplementationAddress, "Implementation address should change after upgrade");
    });


    it(`FUNCTIONALITY: upgradeability
        TESTING: stored data
        EXPECTED: should preserve data across upgrades`, async function () {

        // Get the current membership manager address before upgrade
        const membershipManagerAddress = await governanceManager.getMembershipManager();
        
        // Upgrade the GovernanceManager contract
        const upgradedGovernanceManager = await upgradeGovernanceManager();

        // Get new membership manager address after upgrade
        const newMembershipManager = await upgradedGovernanceManager.connect(deployer).getMembershipManager();
        
        // Check that the membership manager address is still the same after upgrade
        expect(newMembershipManager).to.equal(membershipManagerAddress, "Membership manager address should remain the same after upgrade");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-owner to upgrade the governance manager contract`, async function () {
        
        // Get the current owner of the GovernanceManager contract
        const currentOwner = await governanceManager.owner();// Set the submission verifier to the mock one that returns a valid proof
        expect(currentOwner).to.equal(await deployer.getAddress(), "Current owner should be the deployer");

        // Get contract factory for the new version of GovernanceManager with user1 as signer
        const MockGovernanceManagerV2 = await ethers.getContractFactory("MockGovernanceManagerV2", {
            signer: user1
        }); 
        
        // Attempt to upgrade the GovernanceManager contract
        await expect(upgrades.upgradeProxy(
            governanceManager.target,
            MockGovernanceManagerV2,
            {
                kind: "uups"
            }
        ))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
    });
    /*
    it(`FUNCTION: setMembershipManager
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the owner to set an EOA as the new membership manager`, async function () {
        await expect(governanceManager.connect(deployer).setMembershipManager(await user1.getAddress()))
            .to.be.revertedWithCustomError(governanceManager, "AddressIsNotAContract");
    });

    it(`FUNCTION: setMembershipManager
        TESTING: custom error: NewAddressMustBeDifferent
        EXPECTED: should not allow the owner to set the same address as the new membership manager`, async function () {
        await expect(governanceManager.connect(deployer).setMembershipManager(membershipManager.target))
            .to.be.revertedWithCustomError(governanceManager, "NewAddressMustBeDifferent");
    });

    it(`FUNCTION: setMembershipManager
        TESTING: custom error: InterfaceIdNotSupported
        EXPECTED: should not allow the owner to set a contract as the new membership manager that does not support the IMembershipManager interface`, async function () {

        await expect(governanceManager.connect(deployer).setMembershipManager(proposalManager.target))
            .to.be.revertedWithCustomError(governanceManager, "InterfaceIdNotSupported");
    });

    it(`FUNCTION: setMembershipManager
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the owner to set the zero address as the new membership manager`, async function () {

        await expect(governanceManager.connect(deployer).setMembershipManager(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(governanceManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: setMembershipManager
        TESTING: event: MembershipManagerSet
        EXPECTED: should allow the owner to set a contract that supports the MembershipManager interface as the new membership manager`, async function () {

        // Deploy a mock membership manager contract that implements the IMembershipManager interface
        const mockMembershipManager = await deployMockMembershipManagerV2();

        await expect(governanceManager.connect(deployer).setMembershipManager(mockMembershipManager.target))
            .to.emit(governanceManager, "MembershipManagerSet")
            .withArgs(mockMembershipManager.target);
    });

    it(`FUNCTION: setProposalManager
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the owner to set an EOA as the new proposal manager`, async function () {
        await expect(governanceManager.connect(deployer).setProposalManager(await user1.getAddress()))
            .to.be.revertedWithCustomError(governanceManager, "AddressIsNotAContract");
    });

    it(`FUNCTION: setProposalManager
        TESTING: custom error: NewAddressMustBeDifferent
        EXPECTED: should not allow the owner to set the same address as the new proposal manager`, async function () {
        await expect(governanceManager.connect(deployer).setProposalManager(proposalManager.target))
            .to.be.revertedWithCustomError(governanceManager, "NewAddressMustBeDifferent");
    });

    it(`FUNCTION: setProposalManager
        TESTING: custom error: InterfaceIdNotSupported
        EXPECTED: should not allow the owner to set a contract as the new proposal manager that does not support the IProposalManager interface`, async function () {

        await expect(governanceManager.connect(deployer).setProposalManager(membershipManager.target))
            .to.be.revertedWithCustomError(governanceManager, "InterfaceIdNotSupported");
    });

    it(`FUNCTION: setProposalManager
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the owner to set the zero address as the new proposal manager`, async function () {

        await expect(governanceManager.connect(deployer).setProposalManager(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(governanceManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: setProposalManager
        TESTING: event: ProposalManagerSet
        EXPECTED: should allow the owner to set a contract that supports the ProposalManager interface as the new proposal manager`, async function () {

        // Deploy a mock proposal manager contract that implements the IProposalManager interface
        const mockProposalManager = await deployMockProposalManagerV2();

        await expect(governanceManager.connect(deployer).setProposalManager(mockProposalManager.target))
            .to.emit(governanceManager, "ProposalManagerSet")
            .withArgs(mockProposalManager.target);
    });
    */

    it(`FUNCTION: setRelayer
        TESTING: onlyOwner authorization (success), event: RelayerSet
        EXPECTED: should allow the owner to set a new relayer and emit event`, async function () {
        await expect(governanceManager.connect(deployer).setRelayer(await user1.getAddress()))
            .to.emit(governanceManager, "RelayerSet")
            .withArgs(await user1.getAddress());
        
        // Check that the relayer has been set correctly
        const newRelayer = await governanceManager.connect(deployer).getRelayer();
        expect(newRelayer).to.equal(await user1.getAddress());
    });

    it(`FUNCTION: setRelayer
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-owner to set a new relayer`, async function () {
        await expect(governanceManager.connect(user1).setRelayer(await user1.getAddress()))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setRelayer: should not allow setting the same relayer address
        TESTING: custom error: NewRelayerMustBeDifferent
        EXPECTED: should not allow the owner to set the same relayer address`, async function () {
        await expect(governanceManager.connect(deployer).setRelayer(await relayer.getAddress()))
            .to.be.revertedWithCustomError(governanceManager, "NewRelayerMustBeDifferent");
    });

    it(`FUNCTION: setRelayer: should not allow setting the zero address as relayer
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the owner to set the zero address as relayer`, async function () {
        await expect(governanceManager.connect(deployer).setRelayer(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(governanceManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: delegateSetRoot
        TESTING: onlyRelayer authorization (success), event: RootSet, stored data: root
        EXPECTED: should allow the relayer to set a new root and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(relayer).delegateSetRoot(rootHash1, groupKey))
            .to.emit(membershipManager, 
                "RootInitialized"
            ).withArgs(groupKey,rootHash1);
        // Check that the root has been set correctly
        const currentRoot = await governanceManager.connect(relayer).delegateGetRoot(groupKey);
        expect(currentRoot).to.equal(rootHash1, "The current root should be set to the new root");
    
        await expect(governanceManager.connect(relayer).delegateSetRoot(rootHash2, groupKey))
            .to.emit(
                membershipManager, 
                "RootSet"
            ).withArgs(groupKey, rootHash1, rootHash2);

        // Check that the root has been updated
        const updatedRoot = await governanceManager.connect(relayer).delegateGetRoot(groupKey);
        expect(updatedRoot).to.equal(rootHash2, "The current root should be updated to the new root");
    });

    it(`FUNCTION: delegateSetRoot
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow non-relayer to set a new root`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateSetRoot(rootHash1, groupKey);
        await expect(governanceManager.connect(deployer).delegateSetRoot(rootHash2, groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateDeployGroupNft
        TESTING: onlyRelayer authorization (success), event: GroupNftDeployed
        EXPECTED: should allow the relayer to deploy a new group NFT and emit event`, async function () {
        await expect(governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol))
            .to.emit(
                membershipManager, 
                "GroupNftDeployed"
            )
            .withArgs(groupKey, anyValue, nftName, nftSymbol);
    });

    it(`FUNCTION: delegateDeployGroupNft
        TESTING: stored data: group NFT address
        EXPECTED: should store the correct NFT address after a group NFT is deployed`, async function () {
        // Deploy the group NFT
        const tx = await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const receipt = await tx.wait();
        
        // Parse the logs to find the GroupNftDeployed event
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = membershipManager.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const groupNftDeployedEvent = parsedEvents.find((event) => event && event.name === "GroupNftDeployed");
        expect(groupNftDeployedEvent).to.exist;

        // Check that the stored NFT address is correct
        const nftAddress = groupNftDeployedEvent.args[1];
        expect(nftAddress).to.be.properAddress;
        expect(await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey)).to.equal(nftAddress);
    });

    it(`FUNCTION: delegateMintNftToMember
        TESTING: onlyRelayer authorization (success), event: MemberNftMinted
        EXPECTED: should allow the relayer to mint an NFT to a member and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(relayer).delegateMintNftToMember(await user1.getAddress(), groupKey))
            .to.emit(
                membershipManager, 
                "MemberNftMinted"
            )
            .withArgs(groupKey, await user1.getAddress(), anyUint);
    });

    it(`FUNCTION: delegateMintNftToMember
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to mint an NFT to a member`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateMintNftToMember(await user1.getAddress(), groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateMintNftToMember
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the relayer to mint an NFT to a member if the group does not exist`, async function () {
        await expect(governanceManager.connect(relayer).delegateMintNftToMember(await user1.getAddress(), groupKey))
            .to.be.revertedWithCustomError(
                membershipManager, 
                "GroupNftNotSet"
            );
    });

    it(`FUNCTION: delegateMintNftToMembers
        TESTING: onlyRelayer authorization (success), event: MemberNftMinted, event data: member addresses
        EXPECTED: should allow the relayer to mint NFTs to an array of 30 members and emit event`, async function () {

        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const members = Array.from({length: 30}, () => ethers.Wallet.createRandom().address);

        const tx = await governanceManager.connect(relayer).delegateMintNftToMembers(members, groupKey);
        const receipt = await tx.wait();
        
        // get emitted events from the logs
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = membershipManager.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const memberNftMintedEvents = parsedEvents.filter((event) => event && event.name === "MemberNftMinted");
        
        // should have emitted 30 MemberNftMinted events
        expect(memberNftMintedEvents).to.have.lengthOf(30,  "Should have minted NFTs to 30 members");
        const numEvents = memberNftMintedEvents.length;

        // check that the addresses in the events match the members array
        const eventAddresses = [];
        for(const event of memberNftMintedEvents) {
            eventAddresses.push(event.args[1]);
        }
        
        expect(members).to.deep.equal(eventAddresses, "Minted addresses should match the provided members");
    });

    it(`FUNCTION: delegateMintNftToMembers
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to mint NFTs to an array of members`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);

        // Attempt to mint NFTs via the deployer
        await expect(governanceManager.connect(deployer).delegateMintNftToMembers([await user1.getAddress()], groupKey))
            .to.be.revertedWithCustomError(governanceManager, "OnlyRelayerAllowed");
    });

    it(`FUNCTION: delegateMintNftToMembers
        TESTING: onlyRelayer authorization (failure), custom error: MemberBatchTooLarge
        EXPECTED: should not allow the relayer to mint NFTs to more than 30 members`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        
        // Create an array of 31 random member addresses
        const members = Array.from({length: 31}, () => ethers.Wallet.createRandom().address);

        // Attempt to mint NFTs to the 31 members
        await expect(governanceManager.connect(relayer).delegateMintNftToMembers(members, groupKey))
            .to.be.revertedWithCustomError(membershipManager, "MemberBatchTooLarge");
    });

    it(`FUNCTION: delegateBurnMemberNft
        TESTING: onlyRelayer authorization (success), event: MemberNftBurned
        EXPECTED: should allow the relayer to burn a member's NFT and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateMintNftToMember(await user1.getAddress(), groupKey);
        await expect(governanceManager.connect(relayer).delegateBurnMemberNft(await user1.getAddress(), groupKey))
            .to.emit(
                membershipManager, 
                "MemberNftBurned"
            )
            .withArgs(groupKey, await user1.getAddress(), anyUint);
    });

    it(`FUNCTION: delegateBurnMemberNft
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to burn a member's NFT`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateMintNftToMember(await user1.getAddress(), groupKey);
        await expect(governanceManager.connect(deployer).delegateBurnMemberNft(await user1.getAddress(), groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateBurnMemberNft
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the relayer to burn a member's NFT if the group does not exist`, async function () {
        await expect(governanceManager.connect(relayer).delegateBurnMemberNft(await user1.getAddress(), groupKey))
            .to.be.revertedWithCustomError(
                membershipManager, 
                "GroupNftNotSet"
            );
    });

    it(`FUNCTION: delegateVerifyProposal
        TESTING: onlyRelayer authorization (success), event: ProposalVerified
        EXPECTED: should allow the relayer to verify a proposal submission proof and emit event`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);
      
        // Verify the proposal submission proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposal(
            mockProof, 
            mockProposalPublicSignals1, 
            groupKey,
            proposalContextKey))
            .to.emit(
                proposalManager, 
                "SubmissionVerified"
            )
            .withArgs(proposalContextKey, submissionNullifier1, claimNullifier1, contentHash1);
    });

    it(`FUNCTION: delegateVerifyProposal
        TESTING: onlyRelayer authorization (success), custom error: InvalidSubmissionProof
        EXPECTED: should not verify an invalid proposal submission proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);

        // Set the mock verifier to return an invalid proof
        await mockProposalVerifier.setIsValid(false);
      
        // Verify the proposal submission proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposal(
            mockProof, 
            mockProposalPublicSignals1, 
            groupKey,
            proposalContextKey))
            .to.be.revertedWithCustomError(
                proposalManager, 
                "InvalidSubmissionProof"
            )
            .withArgs(proposalContextKey, submissionNullifier1);
    });

    it(`FUNCTION: delegateVerifyProposal
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to verify a submission proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);
      
        // Verify the proposal submission proof
        await expect(governanceManager.connect(deployer).delegateVerifyProposal(
            mockProof, 
            mockProposalPublicSignals1, 
            groupKey,
            proposalContextKey))
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateVerifyProposalClaim
        TESTING: onlyRelayer authorization (success), event: ProposalClaimVerified
        EXPECTED: should allow the relayer to verify a proposal claim proof and emit event`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal
        await setMockSubmissionVerifierAndVerifyProposal();

        // Set the claim verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);
      
        // Verify the proposal claim proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.emit(
            proposalManager,
            "ClaimVerified"
        ).withArgs(proposalContextKey, claimNullifier1, submissionNullifier1);
    });

    it(`FUNCTION: delegateVerifyProposalClaim
        TESTING: onlyRelayer authorization (success), custom error: InvalidClaimProof
        EXPECTED: should not verify an invalid proposal claim proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal
        await setMockSubmissionVerifierAndVerifyProposal();
    
        // Set the claim verifier to the mock one 
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);

        // Set the mock claim verifier to return an invalid proof
        await mockProposalClaimVerifier.setIsValid(false);

        // Verify the proposal claim proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposalClaim(
            mockProof, 
            mockClaimPublicSignals1, 
            proposalContextKey))
            .to.be.revertedWithCustomError(
                proposalManager, 
                "InvalidClaimProof"
            )
            .withArgs(proposalContextKey, claimNullifier1, submissionNullifier1);
    });

    it(`FUNCTION: delegateVerifyProposalClaim
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to verify a claim proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal 
        await setMockSubmissionVerifierAndVerifyProposal();

        // Set the claim verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);

        // Verify the proposal claim proof
        await expect(governanceManager.connect(deployer).delegateVerifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            proposalContextKey
        )).to.be.revertedWithCustomError(
            governanceManager,
            "OnlyRelayerAllowed"
        );
    });

    it(`FUNCTION: delegateRevokeMinterRole
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to revoke the minter role from the membership manager and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        const role = await nftImplementation.attach(nftAddress).MINTER_ROLE();
        await expect(governanceManager.connect(relayer).delegateRevokeMinterRole(nftAddress))
            .to.emit(
                membershipManager,
                "RoleRevoked"
            )
            .withArgs(nftAddress, role, membershipManager.target);
    });

    it(`FUNCTION: delegateRevokeMinterRole
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to revoke the minter role`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateRevokeMinterRole(nftAddress))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGrantMinterRole
        TESTING: onlyRelayer authorization (success), event: RoleGranted
        EXPECTED: should allow the relayer to grant the minter role to a user and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        const role = await nftImplementation.attach(nftAddress).MINTER_ROLE();
        await expect(governanceManager.connect(relayer).delegateGrantMinterRole(nftAddress, await user1.getAddress()))
            .to.emit(
                membershipManager,
                "RoleGranted"
            )
            .withArgs(nftAddress, role, await user1.getAddress());
    });

    it(`FUNCTION: delegateGrantMinterRole
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to grant the minter role`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateGrantMinterRole(nftAddress, await user1.getAddress()))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateRevokeBurnerRole
        TESTING: onlyRelayer authorization (success), event: RoleRevoked
        EXPECTED: should allow the relayer to revoke the burner role from the membership manager and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        const role = await nftImplementation.attach(nftAddress).BURNER_ROLE();
        await expect(governanceManager.connect(relayer).delegateRevokeBurnerRole(nftAddress))
            .to.emit(
                membershipManager,
                "RoleRevoked"
            )
            .withArgs(nftAddress, role, membershipManager.target);
    });

    it(`FUNCTION: delegateRevokeBurnerRole
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to revoke the burner role`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateRevokeBurnerRole(nftAddress))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            ); 
    });

    it(`FUNCTION: delegateGetProposalSubmissionVerifier
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to view the address of the proposal submission verifier`, async function () {
        const verifierAddress = await governanceManager.connect(relayer).delegateGetProposalSubmissionVerifier();
        expect(verifierAddress).to.equal(proposalVerifier.target);
    });

    it(`FUNCTION: delegateGetProposalSubmissionVerifier
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not a non-relayer to view the address of the proposal submission verifier`, async function () {
        await expect(governanceManager.connect(deployer).delegateGetProposalSubmissionVerifier()).to.be.revertedWithCustomError(
            governanceManager,
            "OnlyRelayerAllowed"
        );
    });

    it(`FUNCTION: delegateGetProposalClaimVerifier
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to view the address of the proposal claim verifier`, async function () {
        const verifierAddress = await governanceManager.connect(relayer).delegateGetProposalClaimVerifier();
        expect(verifierAddress).to.equal(proposalClaimVerifier.target);
    });

    it(`FUNCTION: delegateGetProposalClaimVerifier
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not a non-relayer to view the address of the proposal claim verifier`, async function () {
        await expect(governanceManager.connect(deployer).delegateGetProposalClaimVerifier()).to.be.revertedWithCustomError(
            governanceManager,
            "OnlyRelayerAllowed"
        );
    });

    it(`FUNCTION: delegateGetRoot
        TESTING: onlyRelayer authorization (success), stored data: root
        EXPECTED: should allow the relayer to get the root of a group`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        const root = await governanceManager.connect(relayer).delegateGetRoot(groupKey);
        expect(root).to.equal(rootHash1);
    });

    it(`FUNCTION: delegateGetRoot
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow non-relayer to get the root of a group`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();
        // Attempt to get the root via the deployer
        await expect(governanceManager.connect(deployer).delegateGetRoot(groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetNftImplementation
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to get the address of the NFT implementation`, async function () {
        const nftImplementationAddress = await governanceManager.connect(relayer).delegateGetNftImplementation();
        expect(nftImplementationAddress).to.equal(nftImplementation.target);
    });

    it(`FUNCTION: delegateGetNftImplementation
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the address of the NFT implementation`, async function () {
        await expect(governanceManager.connect(deployer).delegateGetNftImplementation())
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetGroupNftAddress
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to get the address of a group's NFT`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        expect(nftAddress).to.be.properAddress;
    });

    it(`FUNCTION: delegateGetGroupNftAddress
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the address of a group's NFT`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateGetGroupNftAddress(groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetMaxMembersBatch
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to get the maximum number of members that can be minted in a batch`, async function () {
        const maxMembers = await governanceManager.connect(relayer).delegateGetMaxMembersBatch();
        expect(maxMembers).to.equal(30);
    });

    
    it(`FUNCTION: delegateGetMaxMembersBatch
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the maximum number of members that can be minted in a batch`, async function () {
        await expect(governanceManager.connect(deployer).delegateGetMaxMembersBatch())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetProposalSubmissionVerifier
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to get the address of the proposal submission verifier`, async function () {
        const verifierAddress = await governanceManager.connect(relayer).delegateGetProposalSubmissionVerifier();
        expect(verifierAddress).to.equal(proposalVerifier.target);
    });

    it(`FUNCTION: delegateGetProposalSubmissionVerifier
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the address of the proposal submission verifier`, async function () {
        await expect(governanceManager.connect(deployer).delegateGetProposalSubmissionVerifier())
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetProposalClaimVerifier
        TESTING: onlyRelayer authorization (success)
        EXPECTED: should allow the relayer to get the address of the proposal claim verifier`, async function () {
        const verifierAddress = await governanceManager.connect(relayer).delegateGetProposalClaimVerifier();
        expect(verifierAddress).to.equal(proposalClaimVerifier.target);
    });

    it(`FUNCTION: delegateGetProposalClaimVerifier
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the address of the proposal claim verifier`, async function () {
        await expect(governanceManager.connect(deployer).delegateGetProposalClaimVerifier())
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetSubmissionNullifierStatus
        TESTING: onlyRelayer authorization (success), stored data: nullifier status
        EXPECTED: should allow the relayer to get FALSE as the nullifier status of an unused nullifier`, async function () {
        // Create a nullifier
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier"));

        // Check that the nullifier status is FALSE
        const isNullifierUsed = await governanceManager.connect(relayer).delegateGetSubmissionNullifierStatus(nullifier);
        expect(isNullifierUsed).to.equal(false);
    });

    it(`FUNCTION: delegateGetSubmissionNullifierStatus
        TESTING: onlyRelayer authorization (success), stored data: nullifier status
        EXPECTED: should allow the relayer to get TRUE as the nullifier status of a used nullifier`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal
        await setMockSubmissionVerifierAndVerifyProposal();

        // Get the submission nullifier status
        const isNullifierUsed = await governanceManager.connect(relayer).delegateGetSubmissionNullifierStatus(submissionNullifier1);
        expect(isNullifierUsed).to.equal(true);
    });

    it(`FUNCTION: delegateGetSubmissionNullifierStatus
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the nullifier status`, async function () {
        // Create a nullifier
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier"));

        // Attempt to get the nullifier status via the deployer
        await expect(governanceManager.connect(deployer).delegateGetSubmissionNullifierStatus(nullifier))
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateGetClaimNullifierStatus
        TESTING: onlyRelayer authorization (success), stored data: claim nullifier status
        EXPECTED: should allow the relayer to get FALSE as the claim nullifier status of an unused nullifier`, async function () {
        // Create a nullifier
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("claimnullifier"));

        // Check that the nullifier status is FALSE
        const isNullifierUsed = await governanceManager.connect(relayer).delegateGetClaimNullifierStatus(nullifier);
        expect(isNullifierUsed).to.equal(false);
    });

    it(`FUNCTION: delegateGetClaimNullifierStatus
        TESTING: onlyRelayer authorization (success), stored data: claim nullifier status
        EXPECTED: should allow the relayer to get TRUE as the claim nullifier status of a used nullifier`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndSetRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal
        await setMockSubmissionVerifierAndVerifyProposal();

        // Set the claim verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);

        // Verify the proposal claim proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposalClaim(
            mockProof, 
            mockClaimPublicSignals1, 
            proposalContextKey
        )).to.emit(
            proposalManager,
            "ClaimVerified"
        ).withArgs(proposalContextKey, claimNullifier1, submissionNullifier1);

        // Get the submission nullifier status
        const isNullifierUsed = await governanceManager.connect(relayer).delegateGetClaimNullifierStatus(claimNullifier1);
        expect(isNullifierUsed).to.equal(true);
    });

    it(`FUNCTION: delegateGetClaimNullifierStatus
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to get the claim nullifier status`, async function () {
        // Create a nullifier
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier"));

        // Attempt to get the nullifier status via the deployer
        await expect(governanceManager.connect(deployer).delegateGetClaimNullifierStatus(nullifier))
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });


    it(`FUNCTION: getRelayer
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the owner (deployer) to get the relayer address`, async function () {
        const addr = await governanceManager.connect(deployer).getRelayer();
        expect(addr).to.equal(await relayer.getAddress());
    });

    it(`FUNCTION: getRelayer
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-owner to get the relayer address`, async function () {
        await expect(governanceManager.connect(user1).getRelayer())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OwnableUnauthorizedAccount"
            );
    });

    it(`FUNCTION: getMembershipManager
        TESTING: onlyOwner authorization (success)  
        EXPECTED: should allow the owner (deployer) to get the address of the MembershipManager`, async function () {
        const addr = await governanceManager.connect(deployer).getMembershipManager();
        expect(addr).to.equal(membershipManager.target);
    });

    it(`FUNCTION: getMembershipManager
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-owner to get the address of the MembershipManager`, async function () {
        await expect(governanceManager.connect(user1).getMembershipManager())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OwnableUnauthorizedAccount"
            );
    });

    it(`FUNCTION: getProposalManager
        TESTING: onlyOwner authorization (success)  
        EXPECTED: should allow the owner (deployer) to get the address of the ProposalManager`, async function () {
        const addr = await governanceManager.connect(deployer).getProposalManager();
        expect(addr).to.equal(proposalManager.target);
    });

    it(`FUNCTION: getProposalManager
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-owner to get the address of the ProposalManager`, async function () {
        await expect(governanceManager.connect(user1).getProposalManager())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OwnableUnauthorizedAccount"
            );
    });


    it(`FUNCTION: delegateVerifyVote
        TESTING: custom error: ProposalHasNotBeenSubmitted
        EXPECTED: should not allow the relayer to verify a vote if the proposal has not been submitted`, async function () {
        
        await deployGroupNftAndSetRoot();
        await expect(governanceManager.connect(relayer).delegateVerifyVote(
            mockProof,
            mockVotePublicSignals1,
            groupKey,
            voteContextKey
        )).to.be.revertedWithCustomError(
            voteManager, 
            "ProposalHasNotBeenSubmitted"
        );
    });

    it(`FUNCTION: delegateVerifyVote
        TESTING: onlyRelayer authorization (success), event: VoteVerified
        EXPECTED: should allow the relayer to verify a vote proof and emit event`, async function () {
        // Deploy the group NFT and initialize the root
        await governanceManager.connect(relayer).delegateDeployGroupNft(realGroupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateSetRoot(realRoot, realGroupKey);
        await governanceManager.connect(relayer).delegateSetMemberCount(realGroupKey, 1);

        // submit and verify a proposal
        expect(await governanceManager.connect(relayer).delegateVerifyProposal(
            realProposalProof, 
            realProposalPublicSignals, 
            realGroupKey,
            realProposalContextKey
        )).to.emit(
            proposalManager, 
            "SubmissionVerified"
        ).withArgs(
            realProposalContextKey, 
            proposalProofSubmissionNullifier, 
            proposalProofClaimNullifier, 
            proposalProofContentHash
        );

        // verify a vote on the submitted proposal
        expect(await governanceManager.connect(relayer).delegateVerifyVote(
            realVoteProof,
            realVotePublicSignals,
            realGroupKey,
            realVoteContextKey
        )).to.emit(
            voteManager, 
            "VoteVerified"
        ).withArgs(
            realVoteContextKey, 
            voteProofNullifier
        );

    });

})
