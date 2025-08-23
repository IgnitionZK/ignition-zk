const { ethers, upgrades, userConfig } = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Grant Module Unit Tests:", function () {

    let fixtures;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {

        fixtures = await setUpFixtures();

        ({
            // Signers
            governor, user1, deployer, relayer,

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

        // Deploy TreasuryFactory with the BeaconManager address
        treasuryFactory = await TreasuryFactory.deploy(
            beaconManager.target,
            await governor.getAddress()
            //governanceManager.target
        );
        await treasuryFactory.waitForDeployment();

        // Set TreasuryFactory address in GovernanceManager
        await governanceManager.connect(deployer).setTreasuryFactory(treasuryFactory.target);
        
        // Get Contract Factory of Mock GrantModule contract
        const MockGrantModuleWithReceive = await ethers.getContractFactory("MockGrantModuleWithReceive");

        // Deploy the GrantModule UUPS Proxy (ERC‑1967) contract
        grantModule = await upgrades.deployProxy(
            GrantModule,
            [
                await governor.getAddress()
                // governanceManager.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await grantModule.waitForDeployment();

        // Set grant module address in GovernanceManager
        await governanceManager.connect(deployer).addFundingModule(
            grantModule.target,
            ethers.id("grant")
        );
    });

    async function deployTreasuryInstance(treasuryFactorySigner, treasuryMultisig, treasuryRecovery) {
        // Deploy treasury instance
        await treasuryFactory.connect(treasuryFactorySigner).deployTreasury(
            groupKey, 
            true, // hasDeployedNft
            treasuryMultisig,
            treasuryRecovery 
        );

        // Get address of deployed instance
        const treasuryAddr = await treasuryFactory.connect(treasuryFactorySigner).getTreasuryAddress(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddr);
        return { treasuryAddr, treasuryInstance };
    }

    
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

    async function deployTreasuryFactory() {
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

        // Fund grant module with ETH
        
        await deployer.sendTransaction({
            to: mockGrantModule.target,
            value: ethers.parseEther("1.0")
        });
    }

    async function setContractAsSignerAndFund(contract) {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [contract.target]
        });
        
        await deployer.sendTransaction({
            to: contract.target,
            value: ethers.parseEther("2.0")
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


    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy the GrantModule contract`, async function () {
        expect(await grantModule.target).to.be.properAddress;
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner`, async function () {
        expect(await grantModule.owner()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: onlyOwner(), transferOwnership()
        EXPECTED: should allow the owner to transfer ownership of the GrantModule`, async function () {
        await grantModule.connect(governor).transferOwnership(await user1.getAddress());
        expect(await grantModule.owner()).to.equal(await user1.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  onlyOwner(), transferOwnership()
        EXPECTED: should not allow non-owner to transfer ownership of the GrantModule`, async function () {
        await expect(grantModule.connect(user1).transferOwnership(await governor.getAddress()))
            .to.be.revertedWithCustomError(grantModule, "OwnableUnauthorizedAccount");
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  error: OwnableInvalidOwner, transferOwnership()
        EXPECTED: should not allow the owner to transfer ownership to the zero address`, async function () {
        await expect(grantModule.connect(governor).transferOwnership(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(grantModule, "OwnableInvalidOwner");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the owner to upgrade the grant module contract`, async function () {

        const proxyAddress = await grantModule.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the grant module contract to a new version
        const GrantModuleV2 = await ethers.getContractFactory("MockGrantModuleWithReceive", { signer: governor });
        const grantModuleV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            GrantModuleV2, 
            {
                kind: "uups"
            }
        );
        await grantModuleV2.waitForDeployment();

        const upgradedAddress = await grantModuleV2.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);

        // Check if the upgrade was successful
        expect(newImplementationAddress).to.be.properAddress;
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it(`FUNCTIONALITY: upgradeability 
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-owner to upgrade the grant module contract`, async function () {

        const GrantModuleV2 = await ethers.getContractFactory("MockGrantModuleWithReceive", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            await grantModule.target,
            GrantModuleV2,
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(grantModule, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: distributeGrant 
        TESTING: authorization (success), event: GrantRequested
        EXPECTED: should allow the owner to request a grant from the treasury and emit event`, async function () {
        
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        await deployTreasuryFactory();
        await deployMockGrantModule();
        expect(await mockGrantModule.owner()).to.equal(mockGovernanceManager.target);

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstance(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const { treasuryAddr, treasuryInstance } = await deployTreasuryInstance(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());
       
        await expect(mockGrantModule.connect(governanceManagerSigner).distributeGrant(
            treasuryAddr,
            voteContextKey,
            await user1.getAddress(),
            ethers.parseEther("1.0")
        )).to.emit(mockGrantModule, "GrantRequested").withArgs(
            treasuryAddr,
            voteContextKey,
            await user1.getAddress(),
            ethers.parseEther("1.0")
        );

        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);
    });

    it(`FUNCTION: distributeGrant 
        TESTING: authorization (failure)
        EXPECTED: should not allow a non-owner to request a grant from the treasury`, async function () {
        
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        await deployTreasuryFactory();
        await deployMockGrantModule();
        expect(await mockGrantModule.owner()).to.equal(mockGovernanceManager.target);

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstance(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const { treasuryAddr, treasuryInstance } = await deployTreasuryInstance(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());
       
        await expect(mockGrantModule.connect(user1).distributeGrant(
            treasuryAddr,
            voteContextKey,
            await user1.getAddress(),
            ethers.parseEther("1.0")
        )).to.be.revertedWithCustomError(mockGrantModule, "OwnableUnauthorizedAccount");
        
        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);
    });

    it(`FUNCTION: distributeGrant 
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the owner to request a grant to be sent to the zero address`, async function () {
        
        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        await deployTreasuryFactory();
        await deployMockGrantModule();
        expect(await mockGrantModule.owner()).to.equal(mockGovernanceManager.target);

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstance(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const { treasuryAddr, treasuryInstance } = await deployTreasuryInstance(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());
       
        await expect(mockGrantModule.connect(governanceManagerSigner).distributeGrant(
            treasuryAddr,
            voteContextKey,
            ethers.ZeroAddress,
            ethers.parseEther("1.0")
        )).to.be.revertedWithCustomError(mockGrantModule, "AddressCannotBeZero");
        
        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);
    });

     it(`FUNCTION: distributeGrant 
        TESTING: custom error: KeyCannotBeZero
        EXPECTED: should not allow the owner to request a grant with a zero key`, async function () {

        ({ mockGovernanceManager, mockTreasuryManager, mockBeaconManager } = await deployMock_GovernanceManager_TreasuryManager_BeaconManager());
        await deployTreasuryFactory();
        await deployMockGrantModule();
        expect(await mockGrantModule.owner()).to.equal(mockGovernanceManager.target);

        // Get governance manager signer
        const governanceManagerSigner = await setContractAsSignerAndFund(mockGovernanceManager);
        
        // Deploy treasury instance: deployTreasuryInstance(treasuryFactorySigner, treasuryMultisig, treasuryRecovery)
        const { treasuryAddr, treasuryInstance } = await deployTreasuryInstance(governanceManagerSigner, await governor.getAddress(), await governor.getAddress());
       
        await expect(mockGrantModule.connect(governanceManagerSigner).distributeGrant(
            treasuryAddr,
            ethers.ZeroHash,
            await user1.getAddress(),
            ethers.parseEther("1.0")
        )).to.be.revertedWithCustomError(mockGrantModule, "KeyCannotBeZero");
        
        // Stop contract as signer
        await stopContractAsSigner(mockGovernanceManager);
    });




});

/*
function distributeGrant(
        address groupTreasury,
        bytes32 contextKey,
        address to,
        uint256 amount
    ) 
        external 
        onlyOwner
        nonZeroKey(contextKey)
        nonZeroAddress(groupTreasury)
        nonZeroAddress(to) 
    {
        ITreasuryManager(groupTreasury).requestTransfer(
            contextKey,
            to,
            amount,
            FundingTypes.GRANT_TYPE
        );
        emit GrantRequested(groupTreasury, contextKey, to, amount);
    }
*/