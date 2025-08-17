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
            governor, user1, deployer, relayer, fundingModule,

            // Contracts
            TreasuryFactory, GrantModule,
            
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
            treasuryManager, beaconManager,
            membershipVerifier, proposalVerifier, proposalClaimVerifier, voteVerifier,
            mockMembershipVerifier, mockProposalVerifier, mockProposalClaimVerifier, mockVoteVerifier
        } = deployedFixtures);

    });

    async function deployMock_GovernanceManager_TreasuryManager_BeaconManager() {
        // Get Contract factory
        const MockGovernanceManager = await ethers.getContractFactory("MockGovernanceManagerV2");

        // Deploy the Governance UUPS Proxy (ERC‑1967) contract
        const mockGovernanceManager = await upgrades.deployProxy(
            MockGovernanceManager, 
            [
                await deployer.getAddress(),  // _initialOwner
                await relayer.getAddress(), // _relayer
                membershipManager.target, // _membershipManager
                proposalManager.target, // _proposalManager,
                voteManager.target // _voteManager
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await mockGovernanceManager.waitForDeployment();

        // Get contract factory
        const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
        const BeaconManager = await ethers.getContractFactory("BeaconManager");

        // Deploy TreasuryManager without initialization
        const mockTreasuryManager = await TreasuryManager.deploy();
        await mockTreasuryManager.waitForDeployment();

        // Deploy BeaconManager with the TreasuryManager implementation address and temp owner
        const mockBeaconManager = await BeaconManager.deploy(
            mockTreasuryManager.target,
            await deployer.getAddress() // temp owner
        );
        await mockBeaconManager.waitForDeployment();

        return {
            mockGovernanceManager,
            mockTreasuryManager,
            mockBeaconManager
        };
    }

    async function deployTreasuryFactoryWithEOAOwner() {
        // Deploy TreasuryFactory with the BeaconManager address
        treasuryFactory = await TreasuryFactory.deploy(
            beaconManager.target,
            await governor.getAddress() // use test EOA account to simplify testing
        );
        await treasuryFactory.waitForDeployment();

        // Set TreasuryFactory address in GovernanceManager
        await governanceManager.connect(deployer).setTreasuryFactory(treasuryFactory.target);
    }

    async function deployTreasuryFactoryWithContractOwner() {
        // Deploy TreasuryFactory with the BeaconManager address
        treasuryFactory = await TreasuryFactory.deploy(
            mockBeaconManager.target,
            mockGovernanceManager.target // use GM contract as Owner
        );
        await treasuryFactory.waitForDeployment();

        // Set TreasuryFactory address in GovernanceManager
        await mockGovernanceManager.connect(deployer).setTreasuryFactory(treasuryFactory.target);
    }

    async function deployMockGrantModule() {
        // Get Contract factory
        const MockGrantModule = await ethers.getContractFactory("MockGrantModuleWithReceive");
        
        // Deploy the GrantModule UUPS Proxy (ERC‑1967) contract
        mockGrantModule = await upgrades.deployProxy(
            MockGrantModule,
            [
                mockGovernanceManager.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await mockGrantModule.waitForDeployment();

        
        // Set mock grant module address in GovernanceManager
        await mockGovernanceManager.connect(deployer).addFundingModule(
            mockGrantModule.target, // use mockGrantModule for testing
            ethers.id("grant")
        );
    }

    async function setContractAsSignerAndFund(contract) {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [contract.target]
        });
        
        await deployer.sendTransaction({
            to: contract.target,
            value: ethers.parseEther("1.0")
        });
        const contractSigner = await ethers.getSigner(contract.target);

        return contractSigner;
    }

    async function stopContractAsSigner(contract) {
        await network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [contract.target]
        });
    }


    it(`FUNCTION: transferAdminRole
        TESTING: event: AdminRoleTransferred
        EXPECTED: should let treasury owner transfer the default admin role and emit event`, async function () {
        
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            true, // hasDeployedNft
            await governor.getAddress(), // treasuryMultiSig
            await governor.getAddress(), // treasuryRecovery
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.connect(governor).getTreasuryAddress(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);

        // Get current default admin
        const adminRole = await treasuryInstance.connect(governor).DEFAULT_ADMIN_ROLE();
        const hasAdminRole = await treasuryInstance.connect(governor).hasRole(adminRole, governor.getAddress());
        expect(hasAdminRole).to.be.true;

        expect(await treasuryInstance.connect(governor).transferAdminRole(await user1.getAddress()))
            .to.emit(treasuryInstance, "AdminRoleTransferred")
            .withArgs(governor.getAddress(), user1.getAddress());

        const newHasAdminRole = await treasuryInstance.connect(user1).hasRole(adminRole, user1.getAddress());
        expect(newHasAdminRole).to.be.true;

        const oldHasAdminRole = await treasuryInstance.connect(governor).hasRole(adminRole, governor.getAddress());
        expect(oldHasAdminRole).to.be.false;
    });

    it(`FUNCTION: transferAdminRole
        TESTING: custom error: AlreadyHasRole
        EXPECTED: should revert if new admin already has role`, async function () {
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();
        
        // Deploy treasury instance
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            true, // hasDeployedNft
            await governor.getAddress(), // treasuryMultiSig
            await governor.getAddress(), // treasuryRecovery
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.connect(governor).getTreasuryAddress(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);

        await expect(treasuryInstance.connect(governor).transferAdminRole(await governor.getAddress()))
            .to.be.revertedWithCustomError(
                treasuryInstance, 
                "AlreadyHasRole"
            );
    });
  
    it(`FUNCTION: emergencyAccessControl
        TESTING: event: EmergencyAccessGranted
        EXPECTED: should let the emergency recovery role holder grant admin rights to a new admin`, async function () {
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            true, // hasDeployedNft
            await governor.getAddress(), // treasuryMultiSig
            await governor.getAddress(), // treasuryRecovery
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.connect(governor).getTreasuryAddress(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);

        // Get current default admin
        const adminRole = await treasuryInstance.connect(governor).DEFAULT_ADMIN_ROLE();
        
        expect(await treasuryInstance.connect(governor).emergencyAccessControl(await user1.getAddress()))
            .to.emit(treasuryInstance, "EmergencyAccessGranted")
            .withArgs(user1.getAddress());

        // Check that new admin has admin role
        const newHasAdminRole = await treasuryInstance.connect(user1).hasRole(adminRole, user1.getAddress());
        expect(newHasAdminRole).to.be.true;

        // Check that old admin still has role
        const oldHasAdminRole = await treasuryInstance.connect(governor).hasRole(adminRole, governor.getAddress());
        expect(oldHasAdminRole).to.be.true;
    });

    it(`FUNCTION: emergencyAccessControl
        TESTING: custom error: AlreadyHasRole
        EXPECTED: should revert if new admin already has role`, async function () {
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            true, // hasDeployedNft
            await governor.getAddress(), // treasuryMultiSig
            await governor.getAddress(), // treasuryRecovery
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.connect(governor).getTreasuryAddress(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);
        
        await expect(treasuryInstance.connect(governor).emergencyAccessControl(await governor.getAddress()))
            .to.be.revertedWithCustomError(treasuryInstance, "AlreadyHasRole");
    });

    it(`FUNCTION: requestTransfer
        TESTING: event: TransferRequested
        EXPECTED: should allow the authorized funding module to request a transfer and emit event`, async function () {

        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();
        
        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance
        await treasuryFactory.connect(governanceManagerSigner).deployTreasury(
            groupKey, 
            true, // hasDeployedNft
            await governor.getAddress(), // treasuryMultiSig
            await governor.getAddress(), // treasuryRecovery
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.connect(governanceManagerSigner).getTreasuryAddress(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");
        
        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            2, // amount
            grantType // fundingType
        )).to.emit(treasuryInstance, "TransferRequested")
          .withArgs(
            voteContextKey, 
            mockGrantModule.target, 
            await user1.getAddress(), 
            2
        );

        await stopContractAsSigner(mockGrantModule);
    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: UnknownFundingType
        EXPECTED: should revert if the funding type is not present in the FundingTypes library`, async function () {
        
        

        
    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: AmountCannotBeZero
        EXPECTED: should revert if the transfer amount is zero`, async function () {

    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: FundingAlreadyRequested
        EXPECTED: should revert the funding request has already been recorded`, async function () {

    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: UnauthorizedModule
        EXPECTED: should revert if the call does not originate from an active funding module`, async function () {

    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: ActiveModuleNotSet
        EXPECTED: should revert if the active funding module for the funding type has not been set in the GM`, async function () {

    });

    it(`FUNCTION: requestTransfer
        TESTING: event: TransferRequested
        EXPECTED: should allow the authorized funding module to request a transfer and emit event`, async function () {

    });




});