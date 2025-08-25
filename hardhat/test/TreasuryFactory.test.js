const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Treasury Factory Unit Tests:", function () {

    let fixtures;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {

        fixtures = await setUpFixtures();

        ({
            // Signers
            governor, user1, deployer, relayer,

            // Contracts
            TreasuryFactory,
            
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
            await governor.getAddress(), // use EOA governor signer for testing
            membershipManager.target
        );
        await treasuryFactory.waitForDeployment();

        // Set TreasuryFactory address in GovernanceManager
        await governanceManager.connect(deployer).setTreasuryFactory(treasuryFactory.target);
        
    });

    async function deployGroupNftAndSetRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).setRoot(root, group);
    }

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy TreasuryManager, TreasuryFactory, BeaconManager contracts`, async function () {
        expect(await treasuryManager.target).to.be.properAddress;
        expect(await treasuryFactory.target).to.be.properAddress;
        expect(await beaconManager.target).to.be.properAddress;
    });

    it(`SET UP: stored contract addresses
        TESTING: beacon address
        EXPECTED: should store the correct beacon manager address`, async function () {
        expect(await treasuryFactory.beaconManager()).to.equal(beaconManager.target);
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner of the TreasuryFactory`, async function () {
        expect(await treasuryFactory.owner()).to.equal(await governor.getAddress());
        expect(await treasuryFactory.governanceManager()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the deployer as the temporary owner of the BeaconManager`, async function () {
        expect(await beaconManager.owner()).to.equal(await deployer.getAddress());
    });

    it(`SET UP: beacon proxy
        TESTING: EIP‑1967 storage slots (beacon, implementation, admin)
        EXPECTED: should deploy treasuries pointing to the correct beacon and store the correct data in the EIP-1967 slots`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy treasury instance
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            await user1.getAddress(), // treasuryOwner
            await user1.getAddress()
        );

        // Get treasury instance address
        const treasuryAddress = await treasuryFactory.groupTreasuryAddresses(groupKey);

        // Get the bytecode length of the deployed treasury instance
        const code = await ethers.provider.getCode(treasuryAddress);
        // Get the bytecode length of the deployed treasury manager
        const codeTreasuryManager = await ethers.provider.getCode(treasuryManager.target);
        // Check that the treasury instance is a proxy by comparing the runtime bytecode lengths
        expect(code.length).to.be.below(codeTreasuryManager.length);

        // EIP‑1967 storage slots
        // Implementation address should be zero for beacon proxies and non-zero for UUPS/Transaprent proxies
        const implSlot  = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        // Beacon slot should be non-zero for beacon proxies and zero for UUPS/Transparent proxies
        const beaconSlot= "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
        // Admin data should be zero for beacon proxies and non-zero for UUPS/Transparent proxies
        const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

        // Use beacon slot to get stored beacon data
        const storedBeacon = await ethers.provider.getStorage(
            treasuryAddress,
            beaconSlot 
        );

        const storedImpl = await ethers.provider.getStorage(
            treasuryAddress,
            implSlot 
        );

        const storedAdmin = await ethers.provider.getStorage(
            treasuryAddress,
            adminSlot 
        );

        // Get the stored addresses
        const storedBeaconAddress = "0x" + storedBeacon.slice(26);
        const storedImplAddress = "0x" + storedImpl.slice(26);
        const storedAdminAddress = "0x" + storedAdmin.slice(26);

        // The stored beacon address should be the address of the Beacon Manager 
        expect(storedBeaconAddress.toLowerCase()).to.equal(await beaconManager.target.toLowerCase());

        // Get the implementation address from the beacon Manager:
        const beaconImplementation = await beaconManager.implementation();

        // Check that the beacon implementation is the same as the treasury manager
        expect(beaconImplementation.toLowerCase()).to.equal(treasuryManager.target.toLowerCase());

        expect(storedImplAddress).to.equal(ethers.ZeroAddress);
        expect(storedAdminAddress).to.equal(ethers.ZeroAddress);

    });

    it(`FUNCTIONALITY: upgrades
        TESTING: stored beacon: address
        EXPECTED: deployed treasury should point to the correct beacon after deploying new Treasury Manager implementation`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy beacon proxy
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            await user1.getAddress(), // treasuryOwner
            await user1.getAddress() // treasuryRecovery
        );

        // Get proxy address
        const proxyAddress = await treasuryFactory.groupTreasuryAddresses(groupKey);
        
        // Get current beacon from proxy
        const beaconSlot= "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
        const currentBeacon = await ethers.provider.getStorage(proxyAddress, beaconSlot);
        const currentBeaconAddress = "0x" + currentBeacon.slice(26);
        const currentBeaconInstance = await ethers.getContractAt("BeaconManager", currentBeaconAddress);

        // Get Implementation address from current beacon
        const implAddress = await currentBeaconInstance.implementation();
        // Get Implementation address from the beacon Manager
        const beaconManagerImpl = await beaconManager.implementation();
        // Check that the two implementation addresses match
        expect(implAddress).to.equal(beaconManagerImpl);

        // Deploy new TreasuryManager
        const TreasuryManagerV2 = await ethers.getContractFactory("TreasuryManager");
        const treasuryManagerV2 = await TreasuryManagerV2.deploy();
        await treasuryManagerV2.waitForDeployment();
        const newTreasuryManagerAddress = treasuryManagerV2.target;

        // Update beacon
        await beaconManager.connect(deployer).updateImplementation(treasuryManagerV2.target);
        
        // Check that proxy points to the new beacon
        const newImplAddress = await currentBeaconInstance.implementation();
        expect(newImplAddress).to.equal(newTreasuryManagerAddress);

    });

    it(`FUNCTIONALITY: payable treasury
        TESTING: receiving ETH
        EXPECTED: should allow the treasury instance to receive ETH`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy treasury instance
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            await user1.getAddress(), // treasuryMultiSig
            await user1.getAddress() // treasuryRecovery
        );

        // Get treasury instance address
        const treasuryAddress = await treasuryFactory.groupTreasuryAddresses(groupKey);
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddress);

        // Send 1 ETH to the treasury instance
        await deployer.sendTransaction({
            to: treasuryAddress,
            value: ethers.parseEther("1.0")
        });

        // Check balance
        const treasuryBalance = await treasuryInstance.connect(user1).getBalance();
        expect(treasuryBalance).to.equal(ethers.parseEther("1.0"));

    });

    it(`FUNCTION: deployTreasury
        TESTING: event: TreasuryDeployed
        EXPECTED: should allow the governor to deploy a treasury instance and emit event`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy Treasury
        await expect(
            treasuryFactory.connect(governor).deployTreasury(
                groupKey, 
                await governor.getAddress(), // treasuryOwner
                await governor.getAddress() // treasuryRecovery
            )
        ).to.emit(treasuryFactory, "TreasuryDeployed")
        .withArgs(
                groupKey,
                anyValue
        );
    });
    
    it(`FUNCTION: deployTreasury
        TESTING: mapping: groupTreasuryAddresses
        EXPECTED: should correctly store the addresses of the deployed treasury instances`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy Treasury instance for group with groupKey
        const tx = await treasuryFactory.connect(governor).deployTreasury(
                groupKey, 
                await governor.getAddress(), // treasuryOwner
                await governor.getAddress() // treasuryRecovery
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
        const storedTreasuryAddress = await treasuryFactory.groupTreasuryAddresses(groupKey);

        // check that the addresses match
        expect(deployedTreasuryAddress).to.equal(storedTreasuryAddress);

        // Deploy NFT and set root for group2
        await deployGroupNftAndSetRoot(governor, groupKey2, nftName, nftSymbol, rootHash2);

        // Deploy Treasury instance for group with groupKey2
        const tx2 = await treasuryFactory.connect(governor).deployTreasury(
                groupKey2, 
                await governor.getAddress(), // treasuryOwner
                await governor.getAddress() // treasuryRecovery
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
        const storedTreasuryAddress2 = await treasuryFactory.groupTreasuryAddresses(groupKey2);

        // check that the addresses match
        expect(deployedTreasuryAddress2).to.equal(storedTreasuryAddress2);

        // Check that the new treasury address is different
        expect(storedTreasuryAddress2).to.not.equal(storedTreasuryAddress);

        // Check that the first treasury address (groupKey) is still the same
        expect(storedTreasuryAddress).to.equal(await treasuryFactory.groupTreasuryAddresses(groupKey));
    });

    it(`FUNCTION: deployTreasury
        TESTING: authorization (failure)
        EXPECTED: should not let the non-owner to deploy a treasury instance`, async function () {

        // Attempt to deploy Treasury as non-owner
        await expect(
            treasuryFactory.connect(user1).deployTreasury(
                groupKey,
                await governor.getAddress(), // treasuryMultiSig
                await governor.getAddress() // treasuryRecovery
            )
        ).to.be.revertedWithCustomError(
            treasuryFactory, 
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: custom error: GroupTreasuryAlreadyExists
        EXPECTED: should not let the owner to deploy a treasury instance for a group with an existing treasury`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy first treasury instance
        await treasuryFactory.connect(governor).deployTreasury(groupKey, await governor.getAddress(), await governor.getAddress()); 
        // Attempt to deploy a second treasury instance for the same group
        await expect(
            treasuryFactory.connect(governor).deployTreasury(groupKey, await governor.getAddress(), await governor.getAddress())
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
                await governor.getAddress(), // treasuryOwner
                await governor.getAddress() // treasuryRecovery
            )
        ).to.be.revertedWithCustomError(
            treasuryFactory,
            "GroupNftNotSet"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not let the owner to deploy a treasury instance for a group with a zero address`, async function () {
        
        await expect(
            treasuryFactory.connect(governor).deployTreasury(
                groupKey, 
                ethers.ZeroAddress, // treasuryOwner
                await governor.getAddress() // treasuryRecovery
            )
        ).to.be.revertedWithCustomError(
            treasuryFactory,
            "AddressCannotBeZero"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: custom error: KeyCannotBeZero
        EXPECTED: should not let the owner to deploy a treasury instance for a zero group key`, async function () {
        
        await expect(
            treasuryFactory.connect(governor).deployTreasury(
                ethers.ZeroHash, 
                await user1.getAddress(), // treasuryOwner
                await user1.getAddress() // treasuryRecovery
            )
        ).to.be.revertedWithCustomError(
            treasuryFactory,
            "KeyCannotBeZero"
        );
    });

    it(`FUNCTION: deployTreasury
        TESTING: DEFAULT_ADMIN_ROLE
        EXPECTED: should set the correct DEFAULT_ADMIN_ROLE in two different deployed instances`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy treasury instance with governor as DEFAULT_ADMIN
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            await governor.getAddress(), // treasuryOwner
            await governor.getAddress() // treasuryRecovery
        );

        // Get Address of deployed treasury
        const treasuryAddress1 = await treasuryFactory.groupTreasuryAddresses(groupKey);

        // Get instance of deployed treasury
        const treasuryInstance1 = await ethers.getContractAt("TreasuryManager", treasuryAddress1);

        // Get admin role for the deployed treasury
        const adminRole = await treasuryInstance1.DEFAULT_ADMIN_ROLE();

        // Check if governor has admin role
        const isAdmin1 = await treasuryInstance1.hasRole(adminRole, await governor.getAddress());
        expect(isAdmin1).to.be.true;

        // Deploy NFT and set root for group2
        await deployGroupNftAndSetRoot(governor, groupKey2, nftName, nftSymbol, rootHash2);

        // Deploy treasury instance with user1 as DEFAULT_ADMIN
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey2,
            await user1.getAddress(), // treasuryOwner
            await user1.getAddress() // treasuryRecovery
        );

        const treasuryAddress2 = await treasuryFactory.groupTreasuryAddresses(groupKey2);
        const treasuryInstance2 = await ethers.getContractAt("TreasuryManager", treasuryAddress2);
        const adminRole2 = await treasuryInstance2.DEFAULT_ADMIN_ROLE();
        const isAdmin2 = await treasuryInstance2.hasRole(adminRole2, await user1.getAddress());
        expect(isAdmin2).to.be.true;
    });

    it(`FUNCTION: deployTreasury
        TESTING: GOVERNANCE_MANAGER_ROLE, FUNDING_MODULE_ROLE, EMERGENCY_RECOVERY_ROLE
        EXPECTED: should set the correct access roles for the deployed instances`, async function () {
        // Deploy NFT and set root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Deploy treasury instance with governor as DEFAULT_ADMIN
        await treasuryFactory.connect(governor).deployTreasury(
            groupKey,
            await governor.getAddress(), // treasuryOwner
            await user1.getAddress() // treasuryRecovery
        );

        // Get Address of deployed treasury
        const treasuryAddress = await treasuryFactory.groupTreasuryAddresses(groupKey);

        // Get instance of deployed treasury
        const treasuryInstance = await ethers.getContractAt("TreasuryManager", treasuryAddress);

        // Get admin role for the deployed treasury
        const GOVERNANCE_MANAGER_ROLE = ethers.id("GOVERNANCE_MANAGER_ROLE");
        const EMERGENCY_RECOVERY_ROLE = ethers.id("EMERGENCY_RECOVERY_ROLE");
 
        // Check if the governanceManager contract has governanceManager role
        const hasGovernanceManagerRole = await treasuryInstance.hasRole(GOVERNANCE_MANAGER_ROLE, await governor.getAddress());
        expect(hasGovernanceManagerRole).to.be.true;

        // Check if the beaconManager contract has emergency recovery role
        const hasEmergencyRecoveryRole = await treasuryInstance.hasRole(EMERGENCY_RECOVERY_ROLE, await user1.getAddress());
        expect(hasEmergencyRecoveryRole).to.be.true;
    });

});