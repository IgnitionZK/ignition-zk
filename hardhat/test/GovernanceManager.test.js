const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils");

describe("GovernanceManager", function () {
    // Managers
    let MembershipManager;
    let membershipManager;
    let ProposalManager;
    let proposalManager;
    let GovernanceManager;
    let governanceManager;

    // Verifiers
    let ProposalVerifier;
    let proposalVerifier;
    let ProposalClaimVerifier;
    let proposalClaimVerifier;
    let MockProposalVerifier;
    let mockProposalVerifier;
    let MockProposalClaimVerifier;
    let mockProposalClaimVerifier;

    // NFT Implementation
    let NFTImplementation;
    let nftImplementation;
    
    // Signers
    let deployer;
    let relayer; 
    let user1;
    let deployerAddress;
    let relayerAddress;
    let user1Address;

    // Variables for testing
    let groupId;
    let epochId;
    let groupKey;
    let epochKey;
    let contextKey;

    // roots
    let rootHash1;
    let rootHash2;

    // nullifiers
    let submissionNullifier1;
    let submissionNullifier2;
    let claimNullifier1;
    let claimNullifier2;

    // content hashes
    let contentHash1;
    let contentHash2;

    // NFT metadata
    let nftName;
    let nftSymbol;
    let nftName2;
    let nftSymbol2;

    // mock proof inputs
    let mockProof;
    let mockPublicSignals1;
    let mockPublicSignals2;
    let mockClaimPublicSignals1;
    let mockClaimPublicSignals2;

    // real proof inputs
    let realGroupId;
    let realEpochId;
    let realGroupKey;
    let realEpochKey;
    let realContextKey;
    let proofContextHash;
    let proofSubmissionNullifier;
    let proofClaimNullifier;
    let proofContentHash;
    let proofRoot;
    let realPublicSignals;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, relayer, user1] = await ethers.getSigners();

        deployerAddress = await deployer.getAddress();
        relayerAddress = await relayer.getAddress();
        user1Address = await user1.getAddress();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  

        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");

        // Get Contract Factory for ProposalVerifier
        ProposalVerifier = await ethers.getContractFactory("ProposalVerifier");

        // Get Contract Factory for MockProposalVerifier (verifyProof returns true/false)
        MockProposalVerifier = await ethers.getContractFactory("MockProposalVerifier");

        // Get Contract Factory for ProposalClaimVerifier
        ProposalClaimVerifier = await ethers.getContractFactory("ProposalClaimVerifier");

        // Get Contract Factory for MockProposalClaimVerifier (verifyProof returns true/false)
        MockProposalClaimVerifier = await ethers.getContractFactory("MockProposalClaimVerifier");
	
        // Get Contract Factory for ProposalManager
        ProposalManager = await ethers.getContractFactory("ProposalManager");

        // Get Contract Factory for GovernanceManager
        GovernanceManager = await ethers.getContractFactory("GovernanceManager");

        // Initialize variables
        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID for group
        epochId = '123e4567-e89b-12d3-a456-426614174001'; // Example UUID for epoch
        groupKey = Conversions.stringToBytes32(groupId);
        epochKey = Conversions.stringToBytes32(epochId);
        contextKey = await Conversions.computeContextKey(groupId, epochId);
        rootHash1 = Conversions.stringToBytes32("rootHash1");
        rootHash2 = Conversions.stringToBytes32("rootHash2");
        submissionNullifier1 = Conversions.stringToBytes32("submissionNullifier1");
        submissionNullifier2 = Conversions.stringToBytes32("submissionNullifier2");
        claimNullifier1 = Conversions.stringToBytes32("claimNullifier1");
        claimNullifier2 = Conversions.stringToBytes32("claimNullifier2");
        contentHash1 = Conversions.stringToBytes32("contentHash1");
        contentHash2 = Conversions.stringToBytes32("contentHash2");
        nftName = "Test Group NFT";
        nftSymbol = "TGNFT";  
        nftName2 = "Test Group NFT 2";
        nftSymbol2 = "TGNFT2";  

        // mock proof inputs:
        mockProof = [
            1, 2, 3, 4, 5, 6,
            7, 8, 9, 10, 11, 12,
            13, 14, 15, 16, 17, 18,
            19, 20, 21, 22, 23, 24
        ];
        
        mockPublicSignals1 = [
            contextKey,
            submissionNullifier1,
            claimNullifier1,
            rootHash1, 
            contentHash1
        ];

        mockPublicSignals2 = [
            contextKey,
            submissionNullifier2,
            claimNullifier2,
            rootHash2, 
            contentHash2
        ];

        mockClaimPublicSignals1 = [
            claimNullifier1,
            submissionNullifier1,
            contextKey
        ];

        mockClaimPublicSignals2 = [
            claimNullifier2,
            submissionNullifier2,
            contextKey
        ];

        // Real submission proof inputs (CHANGE VALUES)
        realGroupId = '97dca094-bdd7-419b-a91a-5ea1f2aa0537';
        realEpochId = '2935f80b-9cbd-4000-8342-476b97148ee7';
        realGroupKey = Conversions.stringToBytes32(realGroupId);
        realEpochKey = Conversions.stringToBytes32(realEpochId);
        realContextKey = await Conversions.computeContextKey(realGroupId, realEpochId);
        realRoot = ethers.toBeHex(12886375653922554679898676191015074420004311699425387307536167956555820652530n);
        realProof =  [21324237216059067856001326008772402094911947511781008238699193212067506059989n, 2864945365585520580736445144193166667326617123191518303094327819055881893898n, 9465494702140843923161382740269992595504500424060825556224998583474537660180n, 16030498518445137856991221074247654384343749586559714739092600138780412645932n, 13206405049855604729091182801886236353027936746167389593413006162046950936130n, 4048180889747018366596516152682952495036411690853460926059538542586053452269n, 12609570602713816352353876541250421869933566683310145723520331357194292610763n, 7230708155655109188106883860486515119339867121429646046968379650376224850635n, 10422160017288146940026661823861144153069562258697813729447351579113292282332n, 19224572988623427900696980611184826575794205115052705819015127040433839387340n, 5464458218254524957773989784775535143151978126599232326359107991462941009341n, 17466015331361201857470101198136594356860417506221180269276007831559430608536n, 104111675735261926963102685527169626976556205102093081135657122263364031072n, 9647909420810049351150150731868472034940891632806970684008044685699041691902n, 5517304425124738952479655672080171447245708475489731074753736114408015336376n, 3992323730999170742568732932045647379760079477966357347131073234751644727731n, 21584736187497331654923350559507029513407311458396545387156833371106030587174n, 13124016152208354295720478942441341704945400125661605774849977175789656556849n, 94371825887095281395457359605641036224334013945154747165660946136508967536n, 20181668522149303921765270504092927578505186714381356313094322561091892021144n, 2428657391978333859718446390862958247155977941182284203839625529708575207306n, 11530011789437837834442028418577495349735102949773935147946044166578468073553n, 2820924891891396715015254206148811560495416088414132819592239590142857455122n, 11400422769785768671708829126366377902307285817944352534175654791039801233298n]
        realPublicSignals = [1783858561640217141101142531165136293815429284532457890755617800207039425768n, 1783858561640217141101142531165136293815429284532457890755617800207039425768n, 7386565541285461939014061068084680752417332123732607638853227510160241742544n, 12886375653922554679898676191015074420004311699425387307536167956555820652530n, 1086211582699940520437986923287385710360225269413071107044506549724688350225n]
        proofContextHash = ethers.toBeHex(realPublicSignals[0], 32);
        proofSubmissionNullifier = ethers.toBeHex(realPublicSignals[1], 32);
        proofClaimNullifier = ethers.toBeHex(realPublicSignals[2], 32);
        proofRoot = ethers.toBeHex(realPublicSignals[3], 32);
        proofContentHash = ethers.toBeHex(realPublicSignals[4], 32);

        // Real claim proof inputs (ADD VALUES)
        
    });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {
       
        // Deploy the NFT implementation minimal proxy (Clones EIP‑1167) contract
        nftImplementation = await NFTImplementation.deploy();
        await nftImplementation.waitForDeployment();
        
        // Deploy the MembershipMannager UUPS Proxy (ERC‑1967) contract
        membershipManager = await upgrades.deployProxy(
            MembershipManager, 
            [
                deployerAddress, // _initialOwner
                nftImplementation.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await membershipManager.waitForDeployment();
        
        // Deploy the ProposalVerifier contract
        proposalVerifier = await ProposalVerifier.deploy();
        await proposalVerifier.waitForDeployment();

        // Deploy the ProposalClaimVerifier contract
        proposalClaimVerifier = await ProposalClaimVerifier.deploy();
        await proposalClaimVerifier.waitForDeployment();

        // Deploy the MockProposalVerifier contract
        mockProposalVerifier = await MockProposalVerifier.deploy();
        await mockProposalVerifier.waitForDeployment();

        // Deploy the MockProposalClaimVerifier contract
        mockProposalClaimVerifier = await MockProposalClaimVerifier.deploy();
        await mockProposalClaimVerifier.waitForDeployment();

        // Deploy the ProposalManager UUPS Proxy (ERC‑1967) contract with the relayer as the initial owner
        proposalManager = await upgrades.deployProxy(
            ProposalManager, 
            [
                deployerAddress, // _initialOwner
                proposalVerifier.target,
                proposalClaimVerifier.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await proposalManager.waitForDeployment();
        
        // Deploy the Governance UUPS Proxy (ERC‑1967) contract
        governanceManager = await upgrades.deployProxy(
            GovernanceManager, 
            [
                deployerAddress,  // _initialOwner
                relayerAddress, // _relayer
                membershipManager.target, // _membershipManager
                proposalManager.target, // _proposalManager
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await governanceManager.waitForDeployment();
       
        // Transfer ownership of MembershipManager to GovernanceManager
        await membershipManager.transferOwnership(governanceManager.target);

        // Tranfer ownership of ProposalManager to GovernanceManager
        await proposalManager.transferOwnership(governanceManager.target);

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
                deployerAddress, // _initialOwner
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
                deployerAddress, // _initialOwner
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

    async function deployGroupNftAndInitRoot() {
        // Deploy the group NFT and initialize the root
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash1, groupKey);
    }

    async function setMockSubmissionVerifierAndVerifyProposal() {
        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);

        // Submit a proposal
        await governanceManager.connect(relayer).delegateVerifyProposal(
            mockProof,
            mockPublicSignals1,
            groupKey,
            contextKey
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
        expect(await governanceManager.owner()).to.equal(deployerAddress);
    });

    it(`ACCESS CONTROL: ownership
        TESTING: transferOwnership()
        EXPECTED: should allow the owner to transfer ownership of GovernanceManager`, async function () {
        // Transfer ownership from relayer to user1
        await expect(governanceManager.connect(deployer).transferOwnership(user1Address))
            .to.emit(governanceManager, "OwnershipTransferred")
            .withArgs(deployerAddress, user1Address);

        // Check that the ownership has been transferred
        expect(await governanceManager.owner()).to.equal(user1Address);
    });

    it(`ACCESS CONTROL: ownership
        TESTING: transferOwnership()
        EXPECTED: should not allow a non-owner to transfer ownership of GovernanceManager`, async function () {
        await expect(governanceManager.connect(relayer).transferOwnership(user1Address))
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
        expect(currentOwner).to.equal(deployerAddress, "Current owner should be the deployer");

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

    it(`FUNCTION: setRelayer
        TESTING: onlyOwner authorization (success), event: RelayerSet
        EXPECTED: should allow the owner to set a new relayer and emit event`, async function () {
        await expect(governanceManager.connect(deployer).setRelayer(user1Address))
            .to.emit(governanceManager, "RelayerSet")
            .withArgs(user1Address);
        
        // Check that the relayer has been set correctly
        const newRelayer = await governanceManager.connect(deployer).getRelayer();
        expect(newRelayer).to.equal(user1Address);
    });

    it(`FUNCTION: setRelayer
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-owner to set a new relayer`, async function () {
        await expect(governanceManager.connect(user1).setRelayer(user1Address))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setRelayer: should not allow setting the same relayer address
        TESTING: custom error: NewRelayerMustBeDifferent
        EXPECTED: should not allow the owner to set the same relayer address`, async function () {
        await expect(governanceManager.connect(deployer).setRelayer(relayerAddress))
            .to.be.revertedWithCustomError(governanceManager, "NewRelayerMustBeDifferent");
    });

    it(`FUNCTION: setRelayer: should not allow setting the zero address as relayer
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the owner to set the zero address as relayer`, async function () {
        await expect(governanceManager.connect(deployer).setRelayer(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(governanceManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: delegateInitGroup
        TESTING: onlyRelayer authorization (success), event: RootInitialized
        EXPECTED: should allow the relayer to initialize a new group and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(relayer).delegateInitRoot(rootHash1, groupKey)).to.emit(
            membershipManager, 
            "RootInitialized"
        );
    });

    it(`FUNCTION: delegateInitGroup
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow non-relayer to initialize a new group`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateInitRoot(rootHash1, groupKey)).to.be.revertedWithCustomError(
            governanceManager, 
            "OnlyRelayerAllowed"
        );
    });

    it(`FUNCTION: delegateSetRoot
        TESTING: onlyRelayer authorization (success), event: RootSet, stored data: root
        EXPECTED: should allow the relayer to set a new root and emit event`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash1, groupKey);
        await expect(governanceManager.connect(relayer).delegateSetRoot(rootHash2, groupKey))
            .to.emit(
                membershipManager, 
                "RootSet"
            ).withArgs(groupKey, rootHash1, rootHash2);

        // Check that the root has been updated
        const currentRoot = await governanceManager.connect(relayer).delegateGetRoot(groupKey);
        expect(currentRoot).to.equal(rootHash2, "The current root should be updated to the new root");
    });

    it(`FUNCTION: delegateSetRoot
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow non-relayer to set a new root`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash1, groupKey);
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
        await expect(governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey))
            .to.emit(
                membershipManager, 
                "MemberNftMinted"
            )
            .withArgs(groupKey, user1Address, anyUint);
    });

    it(`FUNCTION: delegateMintNftToMember
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to mint an NFT to a member`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateMintNftToMember(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateMintNftToMember
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the relayer to mint an NFT to a member if the group does not exist`, async function () {
        await expect(governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey))
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
        await expect(governanceManager.connect(deployer).delegateMintNftToMembers([user1Address], groupKey))
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
        await governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey);
        await expect(governanceManager.connect(relayer).delegateBurnMemberNft(user1Address, groupKey))
            .to.emit(
                membershipManager, 
                "MemberNftBurned"
            )
            .withArgs(groupKey, user1Address, anyUint);
    });

    it(`FUNCTION: delegateBurnMemberNft
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to burn a member's NFT`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey);
        await expect(governanceManager.connect(deployer).delegateBurnMemberNft(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateBurnMemberNft
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the relayer to burn a member's NFT if the group does not exist`, async function () {
        await expect(governanceManager.connect(relayer).delegateBurnMemberNft(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager, 
                "GroupNftNotSet"
            );
    });

    it(`FUNCTION: delegateVerifyProposal
        TESTING: onlyRelayer authorization (success), event: ProposalVerified
        EXPECTED: should allow the relayer to verify a proposal submission proof and emit event`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();

        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);
      
        // Verify the proposal submission proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposal(
            mockProof, 
            mockPublicSignals1, 
            groupKey,
            contextKey))
            .to.emit(
                proposalManager, 
                "SubmissionVerified"
            )
            .withArgs(contextKey, submissionNullifier1, claimNullifier1, contentHash1);
    });

    it(`FUNCTION: delegateVerifyProposal
        TESTING: onlyRelayer authorization (success), custom error: InvalidSubmissionProof
        EXPECTED: should not verify an invalid proposal submission proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();

        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);

        // Set the mock verifier to return an invalid proof
        await mockProposalVerifier.setIsValid(false);
      
        // Verify the proposal submission proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposal(
            mockProof, 
            mockPublicSignals1, 
            groupKey,
            contextKey))
            .to.be.revertedWithCustomError(
                proposalManager, 
                "InvalidSubmissionProof"
            )
            .withArgs(contextKey, submissionNullifier1);
    });

    it(`FUNCTION: delegateVerifyProposal
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to verify a submission proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();

        // Set the submission verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalSubmissionVerifier(mockProposalVerifier.target);
      
        // Verify the proposal submission proof
        await expect(governanceManager.connect(deployer).delegateVerifyProposal(
            mockProof, 
            mockPublicSignals1, 
            groupKey,
            contextKey))
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it(`FUNCTION: delegateVerifyProposalClaim
        TESTING: onlyRelayer authorization (success), event: ProposalClaimVerified
        EXPECTED: should allow the relayer to verify a proposal claim proof and emit event`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal
        await setMockSubmissionVerifierAndVerifyProposal();

        // Set the claim verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);
      
        // Verify the proposal claim proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
        )).to.emit(
            proposalManager,
            "ClaimVerified"
        ).withArgs(contextKey, claimNullifier1, submissionNullifier1);
    });

    it(`FUNCTION: delegateVerifyProposalClaim
        TESTING: onlyRelayer authorization (success), custom error: InvalidClaimProof
        EXPECTED: should not verify an invalid proposal claim proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();

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
            contextKey))
            .to.be.revertedWithCustomError(
                proposalManager, 
                "InvalidClaimProof"
            )
            .withArgs(contextKey, claimNullifier1, submissionNullifier1);
    });

    it(`FUNCTION: delegateVerifyProposalClaim
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to verify a claim proof`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal 
        await setMockSubmissionVerifierAndVerifyProposal();

        // Set the claim verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);

        // Verify the proposal claim proof
        await expect(governanceManager.connect(deployer).delegateVerifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
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
        await expect(governanceManager.connect(relayer).delegateGrantMinterRole(nftAddress, user1Address))
            .to.emit(
                membershipManager,
                "RoleGranted"
            )
            .withArgs(nftAddress, role, user1Address);
    });

    it(`FUNCTION: delegateGrantMinterRole
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow a non-relayer to grant the minter role`, async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateGrantMinterRole(nftAddress, user1Address))
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
        await deployGroupNftAndInitRoot();

        const root = await governanceManager.connect(relayer).delegateGetRoot(groupKey);
        expect(root).to.equal(rootHash1);
    });

    it(`FUNCTION: delegateGetRoot
        TESTING: onlyRelayer authorization (failure)
        EXPECTED: should not allow non-relayer to get the root of a group`, async function () {
        // Deploy the group NFT and initialize the root
        await deployGroupNftAndInitRoot();
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
        await deployGroupNftAndInitRoot();

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
        await deployGroupNftAndInitRoot();

        // Set the submission verifier to the mock one that returns a valid proof and submit a proposal
        await setMockSubmissionVerifierAndVerifyProposal();

        // Set the claim verifier to the mock one that returns a valid proof
        await governanceManager.connect(deployer).delegateSetProposalClaimVerifier(mockProposalClaimVerifier.target);

        // Verify the proposal claim proof
        await expect(governanceManager.connect(relayer).delegateVerifyProposalClaim(
            mockProof, 
            mockClaimPublicSignals1, 
            contextKey
        )).to.emit(
            proposalManager,
            "ClaimVerified"
        ).withArgs(contextKey, claimNullifier1, submissionNullifier1);

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
        expect(addr).to.equal(relayerAddress);
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

})
