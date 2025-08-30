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
            await governor.getAddress(), // use test EOA account to simplify testing
            membershipManager.target
        );
        await treasuryFactory.waitForDeployment();

        // Set TreasuryFactory address in GovernanceManager
        await governanceManager.connect(deployer).setTreasuryFactory(treasuryFactory.target);
    }

    async function deployTreasuryFactoryWithContractOwner() {
        // Deploy TreasuryFactory with the BeaconManager address
        treasuryFactory = await TreasuryFactory.deploy(
            mockBeaconManager.target,
            mockGovernanceManager.target, // use GM contract as Owner
            membershipManager.target
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

    async function skipDays(numDays) {
        /// Skip timelock
        const daysInSeconds = numDays * 24 * 60 * 60;
        await network.provider.send("evm_increaseTime", [daysInSeconds]);
        // Mine a new block to apply the time change
        await network.provider.send("evm_mine");
    }

    async function deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery) {
        // Deploy treasury instance
        await treasuryFactory.connect(treasuryFactorySigner).deployTreasury(
            groupKey, 
            treasuryMultisig,
            treasuryRecovery 
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.groupTreasuryAddresses(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);
        return treasuryInstance;
    }

    async function deployGroupNftAndSetRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).setRoot(root, group);
    }

    it(`FUNCTION: transferAdminRole
        TESTING: event: AdminRoleTransferred
        EXPECTED: should let treasury admin transfer the default admin role and emit event`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await governor.getAddress(), await governor.getAddress());

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
        TESTING: authorization (failure)
        EXPECTED: should not let a non-admin transfer the default admin role`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await governor.getAddress(), await governor.getAddress());

        await expect(treasuryInstance.connect(deployer).transferAdminRole(await user1.getAddress()))
            .to.be.revertedWithCustomError(treasuryInstance, "AccessControlUnauthorizedAccount");

    });

    it(`FUNCTION: transferAdminRole
        TESTING: custom error: AlreadyHasRole
        EXPECTED: should revert if new admin already has role`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await governor.getAddress(), await governor.getAddress());

        await expect(treasuryInstance.connect(governor).transferAdminRole(await governor.getAddress()))
            .to.be.revertedWithCustomError(
                treasuryInstance, 
                "AlreadyHasRole"
            );
    });
  
    it(`FUNCTION: emergencyAccessControl
        TESTING: event: EmergencyAccessGranted
        EXPECTED: should let the emergency recovery role holder grant admin rights to a new admin`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await governor.getAddress(), await deployer.getAddress());

        // Get current default admin
        const adminRole = await treasuryInstance.connect(governor).DEFAULT_ADMIN_ROLE();
        
        expect(await treasuryInstance.connect(deployer).emergencyAccessControl(await user1.getAddress()))
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
        TESTING: authorization (failure)
        EXPECTED: should not let a non emergency recovery role holder grant admin rights to a new admin`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await governor.getAddress(), await deployer.getAddress());

        await expect(treasuryInstance.connect(governor).emergencyAccessControl(await user1.getAddress()))
            .to.be.revertedWithCustomError(treasuryInstance, "AccessControlUnauthorizedAccount");
    });

    it(`FUNCTION: emergencyAccessControl
        TESTING: custom error: AlreadyHasRole
        EXPECTED: should revert if new admin already has role`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await governor.getAddress(), await governor.getAddress());
        
        await expect(treasuryInstance.connect(governor).emergencyAccessControl(await governor.getAddress()))
            .to.be.revertedWithCustomError(treasuryInstance, "AlreadyHasRole");
    });

    it(`FUNCTION: requestTransfer
        TESTING: event: TransferRequested
        EXPECTED: should allow the authorized funding module to request a transfer and emit event`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();
        
        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
       
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());
       
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
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();
        
        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("unknown");
        
        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            2, // amount
            grantType // fundingType
        )).to.be.revertedWithCustomError(treasuryInstance, "UnknownFundingType");

        await stopContractAsSigner(mockGrantModule);
    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: AmountCannotBeZero
        EXPECTED: should revert if the transfer amount is zero`, async function () {
        
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();
        
        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");
        
        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            0, // amount
            grantType // fundingType
        )).to.be.revertedWithCustomError(treasuryInstance, "AmountCannotBeZero");

        await stopContractAsSigner(mockGrantModule);
    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: FundingAlreadyRequested
        EXPECTED: should revert the funding request has already been recorded`, async function () {
        
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();
        
        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");
        
        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            2, // amount
            grantType // fundingType
        );

        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        )).to.be.revertedWithCustomError(treasuryInstance, "FundingAlreadyRequested");

        await stopContractAsSigner(mockGrantModule);
    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: UnauthorizedModule
        EXPECTED: should revert if the call does not originate from an active funding module`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Set wrong grant module address in GovernanceManager
        await mockGovernanceManager.connect(deployer).addFundingModule(
            membershipManager.target, 
            ethers.id("grant")
        );

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        )).to.be.revertedWithCustomError(treasuryInstance, "UnauthorizedModule");

        await stopContractAsSigner(mockGrantModule);
    });

    it(`FUNCTION: requestTransfer
        TESTING: custom error: ActiveModuleNotSet
        EXPECTED: should revert if the active funding module for the funding type has not been set in the GM`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Remove grant module address from GovernanceManager
        await mockGovernanceManager.connect(deployer).removeFundingModule(
            mockGrantModule.target,
            ethers.id("grant")
        );

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        )).to.be.revertedWithCustomError(treasuryInstance, "ActiveModuleNotSet");

        await stopContractAsSigner(mockGrantModule);
    });

    it(`FUNCTION: requestTransfer
        TESTING: mapping: fundingRequests
        EXPECTED: should store the correct funding request details in the mapping`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        const grantType = ethers.id("grant");
        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        // Request a different transfer
        const voteContextKey2 = Conversions.stringToBytes32("voteContextKey2");;
        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey2,
            await relayer.getAddress(), // to
            1, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Get the stored funding request
        const fundingRequest = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey);

        // Check that the funding request details are correct
        const TIMELOCK_DELAY_DAYS = 3;
        expect(fundingRequest).to.deep.equal([
            grantType,
            await mockGrantModuleSigner.getAddress(),
            await user1.getAddress(),
            BigInt(3),
            fundingRequest.requestedAt,
            fundingRequest.requestedAt + BigInt(TIMELOCK_DELAY_DAYS * 24 * 60 * 60),
            false,
            false,
            false
        ]);

        // Check that the funding request details for the second request are correct
        const fundingRequest2 = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey2);
        expect(fundingRequest2).to.deep.equal([
            grantType,
            await mockGrantModuleSigner.getAddress(),
            await relayer.getAddress(),
            BigInt(1),
            fundingRequest2.requestedAt,
            fundingRequest2.requestedAt + BigInt(TIMELOCK_DELAY_DAYS * 24 * 60 * 60),
            false,
            false,
            false
        ]);

    });

    it(`FUNCTION: approveTransfer
        TESTING: event: TransferApproved
        EXPECTED: should allow the treasury instance owner/admin to approve a funding request`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        expect(await treasuryInstance.connect(governor).approveTransfer(voteContextKey))
            .to.emit(treasuryInstance, "TransferApproved")
            .withArgs(voteContextKey, await user1.getAddress(), 3);
    });

    it(`FUNCTION: approveTransfer
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-owner/admin to approve a funding request`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await expect(treasuryInstance.connect(deployer).approveTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "AccessControlUnauthorizedAccount");

    });

    it(`FUNCTION: approveTransfer
        TESTING: custom error: TransferHasBeenCancelled
        EXPECTED: should not allow a non-owner/admin to approve a funding request that has been cancelled`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Cancel funding request
        await treasuryInstance.connect(governor).cancelTransfer(voteContextKey);

        // Approve funding request
        await expect(treasuryInstance.connect(governor).approveTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferHasBeenCancelled");
    });

    it(`FUNCTION: approveTransfer
        TESTING: custom error: RequestDoesNotExist
        EXPECTED: should revert if the funding request does not exist`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Approve funding request
        await expect(treasuryInstance.connect(governor).approveTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "RequestDoesNotExist");
    });

    it(`FUNCTION: approveTransfer
        TESTING: custom error: TransferAlreadyApproved
        EXPECTED: should not allow the treasury instance owner/admin to approve an already approved funding request`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);

        // Attempt to approve funding request again
        await expect(treasuryInstance.connect(governor).approveTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferAlreadyApproved");
    });

    it(`FUNCTION: approveTransfer
        TESTING: custom error: TransferAlreadyApproved
        EXPECTED: should not allow the treasury instance owner/admin to approve an already executed funding request`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        await treasuryInstance.connect(governor).executeTransfer(voteContextKey);

        // Attempt to approve the already executed funding request
        await expect(treasuryInstance.connect(governor).approveTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferAlreadyApproved");
    });

    
    it(`FUNCTION: approveTransfer
        TESTING: custom error: InconsistentFundingModule
        EXPECTED: should not allow the treasury instance owner/admin to approve a transfer when the funding module is inconsistent`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Change the grant module address in GovernanceManager after requesting the transfer
        await mockGovernanceManager.connect(deployer).addFundingModule(
            membershipManager.target, 
            ethers.id("grant")
        );

        // Approve funding request
        await expect(treasuryInstance.connect(governor).approveTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "InconsistentFundingModule");
    });

    it(`FUNCTION: executeTransfer
        TESTING: event: TransferExecuted
        EXPECTED: should allow the treasury instance owner/admin to execute a transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        expect(await treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.emit(treasuryInstance, "TransferExecuted")
            .withArgs(voteContextKey, await user1.getAddress(), 3);
    });

    it(`FUNCTION: executeTransfer
        TESTING: custom error: TransferHasBeenCancelled
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer that has been cancelled`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);

        // Cancel funding request
        await treasuryInstance.connect(governor).cancelTransfer(voteContextKey);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferHasBeenCancelled");
    });

    it(`FUNCTION: executeTransfer
        TESTING: reentrancy attack
        EXPECTED: should not allow the fund recipient to re-enter`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Deploy the malicious contract
        const MockAttacker = await ethers.getContractFactory("MockMaliciousFundRecipient");
        const mockAttacker = await MockAttacker.deploy(treasuryInstance.target, voteContextKey);
        await mockAttacker.waitForDeployment();
       
        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            mockAttacker.target, // to
            ethers.parseEther("1.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        const treasuryBalanceBefore = await treasuryInstance.connect(governor).getBalance();
        expect(treasuryBalanceBefore).to.equal(ethers.parseEther("5.0"));

        // Execute funding request (with Reentrancy!)
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.emit(mockAttacker, "ReentrancyAttempt");

        // Ensure that the treasury balance is 4ETH (only 1 ETH was transferred)
        const treasuryBalanceAfter = await treasuryInstance.connect(governor).getBalance();
        expect(treasuryBalanceAfter).to.equal(ethers.parseEther("4.0"));

        // Check if reentrancy was attempted
        const hasReentered = await mockAttacker.entered();
        expect(hasReentered).to.be.true;
    });

    it(`FUNCTION: executeTransfer
        TESTING: custom error: RequestDoesNotExist
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer for a request that does not exist`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "RequestDoesNotExist");
    });

    it(`FUNCTION: executeTransfer
        TESTING: custom error: TransferNotApproved
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer that has not been approved`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferNotApproved");
    });

    it(`FUNCTION: executeTransfer
        TESTING: custom error: TreasuryIsLocked
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer when the treasury is locked`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        
        // Skip Timelock 
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Lock treasury
        await treasuryInstance.connect(governor).lockTreasury();

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TreasuryIsLocked");

        // Skip the timelock to automatically unlock the treasury 
        await skipDays(3);

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.emit(treasuryInstance, "TreasuryUnlocked")
            .to.emit(treasuryInstance, "TransferExecuted");

        // Check if the treasury is unlocked
        const isLocked = await treasuryInstance.connect(governor).isLocked();
        expect(isLocked).to.be.false;
    });

    it(`FUNCTION: executeTransfer
        TESTING: event: RequestInTimelock
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer that is still in the timelock period`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        
        // Skip Timelock
        await skipDays(2);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "RequestInTimelock");
    });

    it(`FUNCTION: executeTransfer
        TESTING: event: InconsistentFundingModule
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer with an inconsistent funding module`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);

        // Change the grant module address in GovernanceManager after approving the transfer
        await mockGovernanceManager.connect(deployer).addFundingModule(
            membershipManager.target, 
            ethers.id("grant")
        );
        
        // Skip Timelock 
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "InconsistentFundingModule");
    });

    it(`FUNCTION: executeTransfer
        TESTING: event: InsufficientBalance
        EXPECTED: should not allow the treasury instance owner/admin to execute a transfer with an insufficient treasury balance`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        
        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("2.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "InsufficientBalance");
    });

    it(`FUNCTION: executeTransfer
        TESTING: mapping: fundingRequests, execute status
        EXPECTED: should store the correct funding request details and executed status in the mapping`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        const grantType = ethers.id("grant");
        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("1"), // amount
            grantType // fundingType
        );

        // Request a different transfer
        const voteContextKey2 = Conversions.stringToBytes32("voteContextKey2");;
        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey2,
            await relayer.getAddress(), // to
            ethers.parseEther("2"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding requests
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey2);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Execute one funding request
        await treasuryInstance.connect(governor).executeTransfer(voteContextKey);
        // Cancel the other funding request
        await treasuryInstance.connect(governor).cancelTransfer(voteContextKey2);

        // Get the stored funding request
        const fundingRequest = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey);

        // Check that the funding request details are correct
        expect(fundingRequest).to.deep.equal([
            grantType,
            await mockGrantModuleSigner.getAddress(),
            await user1.getAddress(),
            ethers.parseEther("1"),
            fundingRequest.requestedAt,
            fundingRequest.requestedAt + BigInt(3 * 24 * 60 * 60),
            true,
            true, 
            false
        ]);

        // Check that the funding request details for the second request are correct
        const fundingRequest2 = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey2);
        expect(fundingRequest2).to.deep.equal([
            grantType,
            await mockGrantModuleSigner.getAddress(),
            await relayer.getAddress(),
            ethers.parseEther("2"),
            fundingRequest2.requestedAt,
            fundingRequest2.requestedAt + BigInt(3 * 24 * 60 * 60),
            true,
            false, 
            true
        ]);

    });

    it(`FUNCTION: executeTransfer
        TESTING: custom error: TransferAlreadyExecuted
        EXPECTED: should not allow the treasury instance owner/admin to execute an already executed transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            3, // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        
        // Skip Timelock 
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("5.0") });

        // Execute funding request
        await treasuryInstance.connect(governor).executeTransfer(voteContextKey);

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferAlreadyExecuted");
    });

    it(`FUNCTION: executeTransfer
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-owner/admin to execute a transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        
        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("2.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(deployer).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "AccessControlUnauthorizedAccount");
    });

    it(`FUNCTION: executeTransfer
        TESTING: custom error: TransferFailed
        EXPECTED: should not alter state after a failed transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await membershipManager.target, // to: does not have a receive() function
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Approve funding request
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        
        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(governor).executeTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferFailed");
        
        const fundingRequest = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey);
        // Ensure the request was not marked as executed
        expect(fundingRequest.executed).to.be.false; 
        // Ensure that the treasury's balance remains unchanged
        expect(await treasuryInstance.connect(governor).getBalance()).to.equal(ethers.parseEther("3.0"));
    });

    it(`FUNCTION: approveAndExecuteTransfer
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-owner/admin to approve and execute a transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);
 
        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("2.0") });

        // Execute funding request
        await expect(treasuryInstance.connect(deployer).approveAndExecuteTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "AccessControlUnauthorizedAccount");
    });

    it(`FUNCTION: approveAndExecuteTransfer
        TESTING: authorization (success), events: TransferApproved, TransferExecuted
        EXPECTED: should allow an owner/admin to approve and execute a transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);
 
        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Execute funding request
        expect(await treasuryInstance.connect(governor).approveAndExecuteTransfer(voteContextKey))
            .to.emit(treasuryInstance, "TransferApproved")
            .to.emit(treasuryInstance, "TransferExecuted");
    });

    it(`FUNCTION: approveAndExecuteTransfer
        TESTING: events: TransferExecuted
        EXPECTED: should only execute the transfer and skip approval if it is already approved`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);
       
        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);
 
        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Approve transfer
        await treasuryInstance.connect(governor).approveTransfer(voteContextKey);
        const fundingRequest = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey);
        expect(fundingRequest.approved).to.be.true;

        // Execute funding request
        expect(await treasuryInstance.connect(governor).approveAndExecuteTransfer(voteContextKey))
            .to.emit(treasuryInstance, "ApprovalSkipped")
            .to.emit(treasuryInstance, "TransferExecuted");
    });


    it(`FUNCTION: cancelTransfer
        TESTING: authorization (success), events: TransferCancelled
        EXPECTED: should allow an owner/admin to cancel a requested transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Cancel the funding request
        expect(await treasuryInstance.connect(governor).cancelTransfer(voteContextKey))
            .to.emit(treasuryInstance, "TransferCancelled")
            .withArgs(voteContextKey);

        // Check that the funding request has been marked as cancelled
        const fundingRequest = await treasuryInstance.connect(governor).getFundingRequest(voteContextKey);
        expect(fundingRequest).to.deep.equal([
            grantType,
            mockGrantModule.target,
            await user1.getAddress(),
            ethers.parseEther("3.0"),
            fundingRequest.requestedAt,
            fundingRequest.requestedAt + BigInt(3 * 24 * 60 * 60),
            false,
            false, 
            true
        ]);

        // Attempt to re-request same transfer
        // Get mock grant module contract as signer with funds for gas
        await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        await expect(treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        )).to.be.revertedWithCustomError(treasuryInstance, "FundingAlreadyRequested");

        await stopContractAsSigner(mockGrantModule);

    });

    it(`FUNCTION: cancelTransfer
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-owner/admin to cancel a requested transfer`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Cancel the funding request
        await expect(treasuryInstance.connect(deployer).cancelTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "AccessControlUnauthorizedAccount");
    });

    it(`FUNCTION: cancelTransfer
        TESTING: custom error: RequestDoesNotExist
        EXPECTED: should not allow the owner/admin to cancel a transfer that has never been requested`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Cancel the funding request
        await expect(treasuryInstance.connect(governor).cancelTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "RequestDoesNotExist");
    });

    it(`FUNCTION: cancelTransfer
        TESTING: custom error: TransferAlreadyExecuted
        EXPECTED: should not allow the owner/admin to cancel a transfer that has already been executed`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Execute funding request
        await treasuryInstance.connect(governor).approveAndExecuteTransfer(voteContextKey);

        // Attempt to cancel the funding request
        await expect(treasuryInstance.connect(governor).cancelTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferAlreadyExecuted");
    });
    it(`FUNCTION: cancelTransfer
        TESTING: custom error: TransferAlreadyCancelled
        EXPECTED: should not allow the owner/admin to cancel a transfer that has already been cancelled`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Get mock grant module contract as signer with funds for gas
        const mockGrantModuleSigner = await setContractAsSignerAndFund(mockGrantModule);

        // Request transfer
        const grantType = ethers.id("grant");

        await treasuryInstance.connect(mockGrantModuleSigner).requestTransfer(
            voteContextKey,
            await user1.getAddress(), // to
            ethers.parseEther("3.0"), // amount
            grantType // fundingType
        );

        await stopContractAsSigner(mockGrantModule);

        // Skip Timelock
        await skipDays(3);

        // Fund the treasury instance with ETH
        await treasuryInstance.fund({ value: ethers.parseEther("3.0") });

        // Cancel the funding request
        await treasuryInstance.connect(governor).cancelTransfer(voteContextKey);

        // Attempt to cancel the funding request again
        await expect(treasuryInstance.connect(governor).cancelTransfer(voteContextKey))
            .to.be.revertedWithCustomError(treasuryInstance, "TransferAlreadyCancelled");
    });

    it(`FUNCTION: fund
        TESTING: custom error: AmountCannotBeZero
        EXPECTED: should not allow to fund the treasury with zero amount`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        await expect(treasuryInstance.connect(governor).fund({ value: 0 }))
            .to.be.revertedWithCustomError(treasuryInstance, "AmountCannotBeZero");
    });

    it(`FUNCTION: lockTreasury, unlockTreasury
        TESTING: event: TreasuryLocked, TreasuryUnlocked
        EXPECTED: should emit a TreasuryLocked event when the treasury is locked or unlocked`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Lock the treasury
        await expect(treasuryInstance.connect(governor).lockTreasury())
            .to.emit(treasuryInstance, "TreasuryLocked");
        
        // Check that the treasury is locked
        let isLocked = await treasuryInstance.connect(governor).isLocked();
        expect(isLocked).to.be.true;

        // Unlock the treasury
        await expect(treasuryInstance.connect(governor).unlockTreasury())
            .to.emit(treasuryInstance, "TreasuryUnlocked");

        // Check that the treasury is unlocked
        isLocked = await treasuryInstance.connect(governor).isLocked();
        expect(isLocked).to.be.false;
       
        // lock the treasury again
        await treasuryInstance.connect(governor).lockTreasury();
        
        // Check that the treasury is locked
        isLocked = await treasuryInstance.connect(governor).isLocked();
        expect(isLocked).to.be.true;
        
        // skip 3 days to auto-unlock
        await skipDays(3.1);

        // Check that the treasury is unlocked
        isLocked = await treasuryInstance.connect(governor).isLocked();
        expect(isLocked).to.be.false;  
    });

    it(`FUNCTION: lockTreasury, unlockTreasury
        TESTING: authorization (failure)
        EXPECTED: should not allow the non-admin or non-recovery to lock or unlock the treasury`, async function () {
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployTreasuryFactoryWithContractOwner();
        await deployMockGrantModule();

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);

        // Lock the treasury
        await expect(treasuryInstance.connect(user1).lockTreasury())
            .to.be.revertedWithCustomError(treasuryInstance, "CallerNotAuthorized");

        // Unlock the treasury
        await expect(treasuryInstance.connect(user1).unlockTreasury())
            .to.be.revertedWithCustomError(treasuryInstance, "CallerNotAuthorized");
    });

    it(`FUNCTION: hasEmergencyRecoveryRole, hasGovernanceManagerRole, hasAdminRole
        TESTING: roles
        EXPECTED: should assign the correct roles`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Use EOA test signer as treasury factory owner
        await deployTreasuryFactoryWithEOAOwner();

        // Deploy treasury instance: deployTreasuryInstanceWithEOAOwner(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const treasuryInstance = await deployTreasuryInstanceWithEOAOwner(governor, await deployer.getAddress(), await user1.getAddress());

        // Get current default admin
        const hasAdminRole = await treasuryInstance.hasDefaultAdminRole(await deployer.getAddress());
        expect(hasAdminRole).to.be.true;

        const hasEmergencyRecoveryRole = await treasuryInstance.hasEmergencyRecoveryRole(await user1.getAddress());
        expect(hasEmergencyRecoveryRole).to.be.true;

        const hasGovernanceManagerRole = await treasuryInstance.hasGovernanceManagerRole(await governor.getAddress());
        expect(hasGovernanceManagerRole).to.be.true;

        expect(await treasuryInstance.connect(deployer).transferAdminRole(await user1.getAddress()))
            .to.emit(treasuryInstance, "AdminRoleTransferred")
            .withArgs(await deployer.getAddress(), await user1.getAddress());

        const newHasAdminRole = await treasuryInstance.hasDefaultAdminRole(await user1.getAddress());
        expect(newHasAdminRole).to.be.true;

        const oldHasAdminRole = await treasuryInstance.hasDefaultAdminRole(await deployer.getAddress());
        expect(oldHasAdminRole).to.be.false;
    });

});