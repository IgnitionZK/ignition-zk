const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils.js");

describe("Proposal Manager Unit Tests:", function () {
    
    // Managers
    let MembershipManager;
    let membershipManager;
    let ProposalManager;
    let proposalManager;
    
    // Verifiers
    let ProposalVerifier;
    let proposalVerifier;
    let ProposalClaimVerifier;
    let proposalClaimVerifier;
    let MockProposalVerifier;
    let mockProposalVerifier;
    let MockProposalVerifierV2;
    let mockProposalVerifierV2;
    let MockProposalClaimVerifier;
    let mockProposalClaimVerifier;

    // NFT Implementation
    let NFTImplementation;
    let nftImplementation;

    // Signers
    let deployer;
    let governor;
    let relayer; 
    let user1;

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
    let ProofContextHash;
    let ProofSubmissionNullifier;
    let ProofClaimNullifier;
    let ProofContentHash;
    let ProofRoot;
    let realPublicSignals;


    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, governor, relayer, user1] = await ethers.getSigners();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  

        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");

        // Get Contract Factory for ProposalVerifier
        ProposalVerifier = await ethers.getContractFactory("ProposalVerifier");

        // Get Contract Factory for MockProposalVerifier (verifyProof returns true/false)
        MockProposalVerifier = await ethers.getContractFactory("MockProposalVerifier");

        // Get Contract Factory for MockProposalVerifierV2 (verifyProof reverts)
        MockProposalVerifierV2 = await ethers.getContractFactory("MockProposalVerifierV2");

        // Get Contract Factory for ProposalClaimVerifier
        ProposalClaimVerifier = await ethers.getContractFactory("ProposalClaimVerifier");

        // Get Contract Factory for MockProposalClaimVerifier
        MockProposalClaimVerifier = await ethers.getContractFactory("MockProposalClaimVerifier");

        // Get Contract Factory for ProposalManager
        ProposalManager = await ethers.getContractFactory("ProposalManager");

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
        ProofContextHash = ethers.toBeHex(realPublicSignals[0], 32);
        ProofSubmissionNullifier = ethers.toBeHex(realPublicSignals[1], 32);
        ProofClaimNullifier = ethers.toBeHex(realPublicSignals[2], 32);
        ProofRoot = ethers.toBeHex(realPublicSignals[3], 32);
        ProofContentHash = ethers.toBeHex(realPublicSignals[4], 32);

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
                await governor.getAddress(),
                nftImplementation.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await membershipManager.waitForDeployment();

        // Deploy ProposalVerifier contract
        proposalVerifier = await ProposalVerifier.deploy();
        await proposalVerifier.waitForDeployment();

        // Deploy MockProposalVerifier contract
        mockProposalVerifier = await MockProposalVerifier.deploy();
        await mockProposalVerifier.waitForDeployment();

        // Deploy MockProposalVerifierV2 contract
        mockProposalVerifierV2 = await MockProposalVerifierV2.deploy();
        await mockProposalVerifierV2.waitForDeployment();

        // Deploy ProposalClaimVerifier contract
        proposalClaimVerifier = await ProposalClaimVerifier.deploy();
        await proposalClaimVerifier.waitForDeployment();

        // Deploy MockProposalClaimVerifier contract
        mockProposalClaimVerifier = await MockProposalClaimVerifier.deploy();
        await mockProposalClaimVerifier.waitForDeployment();

        // Deploy ProposalManager UUPS Proxy (ERC‑1967) contract
        proposalManager = await upgrades.deployProxy(
            ProposalManager, 
            [
                await governor.getAddress(),
                proposalVerifier.target, 
                proposalClaimVerifier.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await proposalManager.waitForDeployment();
    });

    
    async function deployGroupNftAndInitRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).initRoot(root, group);
    }

    async function setSubmissionVerifierAndVerifyProposal(signer, verifier, proof, publicSignals, contextKey, root) {
        // Set the proposal submission verifier
        await proposalManager.connect(signer).setProposalSubmissionVerifier(verifier);
        // Verify the proposal
        return await proposalManager.connect(signer).verifyProposal(
            proof,
            publicSignals,
            contextKey,
            root
        );
    }

    async function setClaimVerifierAndVerifyClaim(signer, verifier, proof, publicSignals, contextKey, root) {
        // Set the proposal claim verifier
        await proposalManager.connect(signer).setProposalClaimVerifier(verifier);
        // Verify the claim
        return await proposalManager.connect(signer).verifyProposalClaim(
            proof,
            publicSignals,
            contextKey
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
        expect(upgradedAddress).to.be.properAddress;
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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);

        // check that the submission nullifier is stored correctly
        expect(await proposalManager.connect(governor).getSubmissionNullifierStatus(submissionNullifier1)).to.equal(true);

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
        expect(await proposalManagerV2.connect(governor).getSubmissionNullifierStatus(submissionNullifier1)).to.equal(true);

    });


    it(`FUNCTION: getProposalSubmissionVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to view the address of the proposal submission verifier contract`, async function () {
        
        expect(await proposalManager.connect(governor).getProposalSubmissionVerifier()).to.equal(proposalVerifier.target);
    });

    it(`FUNCTION: getProposalSubmissionVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to view the address of the proposal verifier contract`, async function () {
        
        await expect(proposalManager.connect(user1).getProposalSubmissionVerifier())
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
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
        expect(await proposalManager.connect(governor).getProposalSubmissionVerifier()).to.equal(mockProposalVerifier.target);
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

    it(`FUNCTION: setProposalSubmissionVerifier
        TESTING: custom error: AddressDoesNotSupportInterface
        EXPECTED: should not allow the governor to set the submission verifier to an address not implementing the IProposalVerifier interface`, async function () {
        await expect(proposalManager.connect(governor).setProposalSubmissionVerifier(membershipManager.target))
            .to.be.revertedWithCustomError(proposalManager, "AddressDoesNotSupportInterface");
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
        expect(await proposalManager.connect(governor).getProposalClaimVerifier()).to.equal(mockProposalClaimVerifier.target);
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

    it(`FUNCTION: setProposalClaimVerifier
        TESTING: custom error: AddressDoesNotSupportInterface
        EXPECTED: should not allow the governor to set the claim verifier to an address not implementing the IProposalClaimVerifier interface`, async function () {
        await expect(proposalManager.connect(governor).setProposalClaimVerifier(membershipManager.target))
            .to.be.revertedWithCustomError(proposalManager, "AddressDoesNotSupportInterface");
    });


    it(`FUNCTION: getProposalClaimVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to view the address of the proposal claim verifier contract`, async function () {
        
        expect(await proposalManager.connect(governor).getProposalClaimVerifier()).to.equal(proposalClaimVerifier.target);
    });

    it(`FUNCTION: getProposalClaimVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to view the address of the proposal claim verifier contract`, async function () {
        
        await expect(proposalManager.connect(user1).getProposalClaimVerifier())
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: event: SubmissionVerified, mapping: submissionNullifier
        EXPECTED: should store two submission nullifiers after verifying two different proposals`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        const tx = await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);  

        // expect the event to be emitted with the correct arguments
        await expect(tx).to.emit(proposalManager, "SubmissionVerified").withArgs(contextKey, submissionNullifier1, claimNullifier1, contentHash1);
        
        // check if the submission nullifier status is stored correctly
        expect(await proposalManager.connect(governor).getSubmissionNullifierStatus(submissionNullifier1)).to.equal(true);

        // set a new root for the group key
        await membershipManager.connect(governor).setRoot(rootHash2, groupKey);

        // verify the second proposal with a different root and submission nullifier
        const tx2 = await proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockPublicSignals2,
            contextKey,
            rootHash2
        );

        // expect the event to be emitted with the correct arguments
        await expect(tx2).to.emit(proposalManager, "SubmissionVerified").withArgs(contextKey, submissionNullifier2, claimNullifier2, contentHash2);
        
        // check if the submission nullifier status is stored correctly
        expect(await proposalManager.connect(governor).getSubmissionNullifierStatus(submissionNullifier2)).to.equal(true);
        
        // check if the first submission nullifier is still valid
        expect(await proposalManager.connect(governor).getSubmissionNullifierStatus(submissionNullifier1)).to.equal(true);
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: SubmissionNullifierAlreadyUsed
        EXPECTED: should not allow the governor to verify a proposal with a used submission nullifier`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);

        // try to verify the same proposal again with the same submission nullifier
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockPublicSignals1,
            contextKey,
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "SubmissionNullifierAlreadyUsed");
    });

    it(`FUNCTION verifyProposal (with mock submission verifier): 
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proposal with an invalid context key`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockPublicSignals1,
            Conversions.stringToBytes32("invalidContextKey"), 
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a proposal with a root different than the current root`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockPublicSignals1,
            contextKey,
            rootHash2
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
            mockPublicSignals1,
            contextKey,
            ethers.ZeroHash
        )).to.be.revertedWithCustomError(proposalManager, "RootNotYetInitialized");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: onlyOwner authorization
        EXPECTED: should not allow non-governor to verify a proposal`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        await expect(proposalManager.connect(user1).verifyProposal(
            mockProof,
            mockPublicSignals1,
            contextKey,
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not let governor verify a proposal with an invalid proof`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier
        await proposalManager.connect(governor).setProposalSubmissionVerifier(mockProposalVerifier.target);
        
        // set the mock submission verifier to return an invalid proof
        await mockProposalVerifier.connect(governor).setIsValid(false);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockPublicSignals1,
            contextKey,
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(contextKey, submissionNullifier1);
    });

    it(`FUNCTION: verifyProposal (with mock submission verifier)
        TESTING: custom error: SubmissionNullifierAlreadyUsed, Cross-context nullifier conflict
        EXPECTED: should not allow the governor to verify a proposal with a submission nullifier already used in another context`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);
 
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
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "SubmissionNullifierAlreadyUsed");
    });

    it(`FUNCTION: verifyProposal (with real verifier, mock proof)
        TESTING: zero proof inputs handling
        EXPECTED: should not allow the governor to verify a proposal with a zero proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        const zeroProof = new Array(24).fill(0);

        await expect(proposalManager.connect(governor).verifyProposal(
            zeroProof,
            mockPublicSignals1,
            contextKey,
            rootHash1
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(contextKey, submissionNullifier1);
    });


    it("verifyProposal / REAL VERIFIER, REAL PROOF: should allow the governor to verify a proposal with a valid proof", async function () {
        console.log("TO DO:");
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier)
        TESTING: custom error: ProposalHasNotBeenSubmitted
        EXPECTED: should not allow the governor to verify a proposal claim for a non-submitted proposal`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // verify a proposal claim
        await expect(
            proposalManager.connect(governor).verifyProposalClaim(
                mockProof,
                mockClaimPublicSignals1,
                contextKey
            )
        ).to.be.revertedWithCustomError(proposalManager, "ProposalHasNotBeenSubmitted");
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier)
        TESTING: custom error: InvalidContextHash 
        EXPECTED: should not allow the governor to verify a proposal claim with a wrong contextKey`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);
        
        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // verify a proposal claim
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
        )).to.emit(proposalManager, "ClaimVerified").withArgs(
            contextKey,
            claimNullifier1,
            submissionNullifier1
        );

        const claimNullifierStatus = await proposalManager.connect(governor).getClaimNullifierStatus(claimNullifier1);
        expect(claimNullifierStatus).to.equal(true, "Claim nullifier status should be true after verification");
    });

    it(`FUNCTION: verifyProposalClaim (with mock claim verifier) 
        TESTING: custom error: ProposalHasAlreadyBeenClaimed
        EXPECTED: should not allow the governor to verify a proposal claim for a claimed proposal`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // verify a proposal claim
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
        )).to.emit(proposalManager, "ClaimVerified").withArgs(
            contextKey,
            claimNullifier1,
            submissionNullifier1
        );

        // verify the same proposal claim again
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
        )).to.be.revertedWithCustomError(proposalManager, "ProposalHasAlreadyBeenClaimed");

    });

    it(`FUNCTION: verifyProposalClaim (with mock submission verifier)
        TESTING: onlyOwner authorization 
        EXPECTED: should not allow non-governor to verify a proposal claim`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);
        
        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target); 
        
        // verify a proposal claim with user1
        await expect(proposalManager.connect(user1).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
        )).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyProposalClaim (with mock submission verifier)
        TESTING: custom error: InvalidClaimProof
        EXPECTED: should not allow governor to verify a proposal claim with an invalid proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);

        // set the proposal claim verifier to the mock verifier
        await proposalManager.connect(governor).setProposalClaimVerifier(mockProposalClaimVerifier.target);
        
        // set the mock proposal claim verifier to return an invalid proof
        await mockProposalClaimVerifier.connect(governor).setIsValid(false);

        // verify a proposal claim with an invalid proof
        await expect(proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals1,
            contextKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidClaimProof");
    });

    it(`FUNCTION: getClaimNullifierStatus
        TESTING: stored data: claimNullifier
        EXPECTED: should store two claim nullifiers after verifying two different proposal claims`, async function () {
        // deploy group NFT and initialize group root for the first proposal
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);
        
        // set the proposal claim verifier to the mock verifier and verify the first proposal claim
        await setClaimVerifierAndVerifyClaim(governor, mockProposalClaimVerifier.target, mockProof, mockClaimPublicSignals1, contextKey, rootHash1);
       
        // check if the claim nullifier status is stored correctly
        expect(await proposalManager.connect(governor).getClaimNullifierStatus(claimNullifier1)).to.equal(true);

        // set a new root for the group key
        await membershipManager.connect(governor).setRoot(rootHash2, groupKey);

        // verify the second proposal
        await proposalManager.connect(governor).verifyProposal(
            mockProof,
            mockPublicSignals2,
            contextKey,
            rootHash2
        );

        // verify the second proposal claim
        await proposalManager.connect(governor).verifyProposalClaim(
            mockProof,
            mockClaimPublicSignals2,
            contextKey
        );
        // check if the claim nullifier status is stored correctly
        expect(await proposalManager.connect(governor).getClaimNullifierStatus(claimNullifier2)).to.equal(true);
        // check if the first claim nullifier is still valid
        expect(await proposalManager.connect(governor).getClaimNullifierStatus(claimNullifier1)).to.equal(true);
    }); 

    it(`FUNCTION: getClaimNullifierStatus
        TESTING: onlyOwner authorization
        EXPECTED: should not allow non-governor to check the status of a proposal claim nullifier`, async function () {
        // deploy group NFT and initialize group root for the first proposal
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
       
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);
        
        // set the proposal claim verifier to the mock verifier and verify the first proposal claim
        await setClaimVerifierAndVerifyClaim(governor, mockProposalClaimVerifier.target, mockProof, mockClaimPublicSignals1, contextKey, rootHash1);
       
        // check if the claim nullifier status is stored correctly
        await expect(proposalManager.connect(user1).getClaimNullifierStatus(claimNullifier1)).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: getSubmissionNullifierStatus
        TESTING: onlyOwner authorization
        EXPECTED: should not allow non-governor to check the status of a proposal submission nullifier`, async function () {
        // deploy group NFT and initialize group root for the first proposal
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
       // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProof, mockPublicSignals1, contextKey, rootHash1);
       
        // check if the submission nullifier status is stored correctly
        await expect(proposalManager.connect(user1).getSubmissionNullifierStatus(submissionNullifier1))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    


});