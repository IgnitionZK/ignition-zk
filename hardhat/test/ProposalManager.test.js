const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils.js");

describe("ProposalManager", function () {
    let MembershipManager;
    let membershipManager;
    let MembershipVerifier;
    let membershipVerifier;

    let ProposalManager;
    let proposalManager;
    let ProposalVerifier;
    let proposalVerifier;

    let NFTImplementation;
    let nftImplementation;

    let deployer;
    let governor;
    let relayer; 
    let user1;

    let groupId;
    let epochId;
    let groupKey;
    let contextKey;
    let rootHash;
    let rootHash2;

    let nftName;
    let nftSymbol;
    let nftName2;
    let nftSymbol2;

    let invalidProof;
    let invalidPublicSignals;

    let validGroupId;
    let validEpochId;
    let validGroupKey;
    let validEpochKey;
    let validContextKey;
    let validProposalContextHash;
    let validProposalNullifier;
    let validContentHash;
    let validRoot;
    let validProof;
    let validPublicSignals;
    

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, governor, relayer, user1] = await ethers.getSigners();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  
        // Get Contract Factory for MembershipManagerVerifier
        MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");

        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");

        // Get Contract Factory for ProposalVerifier
        ProposalVerifier = await ethers.getContractFactory("ProposalVerifier");

        // Get Contract Factory for ProposalManager
        ProposalManager = await ethers.getContractFactory("ProposalManager");
    });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {
        // Deploy MembershipVerifier contract
        membershipVerifier = await MembershipVerifier.deploy();
        await membershipVerifier.waitForDeployment();

        // Deploy the NFT implementation minimal proxy (Clones EIP‑1167) contract
        nftImplementation = await NFTImplementation.deploy();
        await nftImplementation.waitForDeployment();

        // Deploy the MembershipMannager UUPS Proxy (ERC‑1967) contract
        membershipManager = await upgrades.deployProxy(
            MembershipManager, 
            [
                membershipVerifier.target, 
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

        // Deploy ProposalManager UUPS Proxy (ERC‑1967) contract
        proposalManager = await upgrades.deployProxy(
            ProposalManager, 
            [
                proposalVerifier.target, 
                await governor.getAddress()
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await proposalManager.waitForDeployment();

        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID for group
        epochId = '123e4567-e89b-12d3-a456-426614174001'; // Example UUID for epoch
        groupKey = Conversions.stringToBytes32(groupId);
        epochKey = Conversions.stringToBytes32(epochId);
        contextKey = await Conversions.computeContextKey(groupId, epochId);
        rootHash = Conversions.stringToBytes32("rootHash");
        rootHash2 = Conversions.stringToBytes32("newRootHash");
        nftName = "Test Group NFT";
        nftSymbol = "TGNFT";  
        nftName2 = "Test Group NFT 2";
        nftSymbol2 = "TGNFT2";  

        // invalid proof inputs:
        invalidProof = [
            1, 2, 3, 4, 5, 6,
            7, 8, 9, 10, 11, 12,
            13, 14, 15, 16, 17, 18,
            19, 20, 21, 22, 23, 24
        ];
        invalidPublicSignals = [
            Conversions.stringToBytes32("context"),
            Conversions.stringToBytes32("nullifier"),
            groupKey, 
            epochKey
        ];

        //valid proof inputs:
        validGroupId = '97dca094-bdd7-419b-a91a-5ea1f2aa0537';
        validEpochId = '2935f80b-9cbd-4000-8342-476b97148ee7';
        validGroupKey = Conversions.stringToBytes32(validGroupId);
        validEpochKey = Conversions.stringToBytes32(validEpochId);
        validContextKey = await Conversions.computeContextKey(validGroupId, validEpochId);
        validRoot = ethers.toBeHex(12886375653922554679898676191015074420004311699425387307536167956555820652530n);
        validProof =  [21324237216059067856001326008772402094911947511781008238699193212067506059989n, 2864945365585520580736445144193166667326617123191518303094327819055881893898n, 9465494702140843923161382740269992595504500424060825556224998583474537660180n, 16030498518445137856991221074247654384343749586559714739092600138780412645932n, 13206405049855604729091182801886236353027936746167389593413006162046950936130n, 4048180889747018366596516152682952495036411690853460926059538542586053452269n, 12609570602713816352353876541250421869933566683310145723520331357194292610763n, 7230708155655109188106883860486515119339867121429646046968379650376224850635n, 10422160017288146940026661823861144153069562258697813729447351579113292282332n, 19224572988623427900696980611184826575794205115052705819015127040433839387340n, 5464458218254524957773989784775535143151978126599232326359107991462941009341n, 17466015331361201857470101198136594356860417506221180269276007831559430608536n, 104111675735261926963102685527169626976556205102093081135657122263364031072n, 9647909420810049351150150731868472034940891632806970684008044685699041691902n, 5517304425124738952479655672080171447245708475489731074753736114408015336376n, 3992323730999170742568732932045647379760079477966357347131073234751644727731n, 21584736187497331654923350559507029513407311458396545387156833371106030587174n, 13124016152208354295720478942441341704945400125661605774849977175789656556849n, 94371825887095281395457359605641036224334013945154747165660946136508967536n, 20181668522149303921765270504092927578505186714381356313094322561091892021144n, 2428657391978333859718446390862958247155977941182284203839625529708575207306n, 11530011789437837834442028418577495349735102949773935147946044166578468073553n, 2820924891891396715015254206148811560495416088414132819592239590142857455122n, 11400422769785768671708829126366377902307285817944352534175654791039801233298n]
        validPublicSignals = [1783858561640217141101142531165136293815429284532457890755617800207039425768n, 7386565541285461939014061068084680752417332123732607638853227510160241742544n, 12886375653922554679898676191015074420004311699425387307536167956555820652530n, 1086211582699940520437986923287385710360225269413071107044506549724688350225n]
        ProofContextHash = ethers.toBeHex(validPublicSignals[0], 32);
        ProofProposalNullifier = ethers.toBeHex(validPublicSignals[1], 32);
        ProofRoot = ethers.toBeHex(validPublicSignals[2], 32);
        ProofContentHash = ethers.toBeHex(validPublicSignals[3], 32);
    });

    it("deployment: should deploy Membership Verifier, MembershipManager, ProposalVerifier, ProposalManager contracts", async function () {
        expect(await membershipManager.target).to.be.properAddress;
        expect(await proposalManager.target).to.be.properAddress;
        expect(await membershipVerifier.target).to.be.properAddress;
        expect(await proposalVerifier.target).to.be.properAddress;
        expect(await nftImplementation.target).to.be.properAddress;
    });

    it("ownership: should set the governor as the owner of MembershipManager and ProposalManager", async function () {
        expect(await membershipManager.owner()).to.equal(await governor.getAddress());
        expect(await proposalManager.owner()).to.equal(await governor.getAddress());
    });

    it("ownership: should allow the governor to transfer ownership of the proposal manager", async function () {
        await proposalManager.connect(governor).transferOwnership(await user1.getAddress());
        expect(await proposalManager.owner()).to.equal(await user1.getAddress());
    });

    it("ownership: should not allow non-governor to transfer ownership of the proposal manager", async function () {
        await expect(proposalManager.connect(user1).transferOwnership(await governor.getAddress()))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it("upgrades: should allow the governor to upgrade the proposal manager contract", async function () {
        const proxyAddress = await proposalManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        const ProposalManagerV2 = await ethers.getContractFactory("ProposalManagerV2", { signer: governor });
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
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it("upgrades: should not allow non-governor to upgrade the proposal manager contract", async function () {
        const ProposalManagerV2 = await ethers.getContractFactory("ProposalManagerV2", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            proposalManager.target, 
            ProposalManagerV2, 
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it("getVerifier: should allow the governor to view the address of the proposal verifier contract", async function () {
        expect(await proposalManager.connect(governor).getProposalVerifier()).to.equal(proposalVerifier.target);
    });

    it("getVerifier: should not allow non-governor to view the address of the proposal verifier contract", async function () {
        await expect(proposalManager.connect(user1).getProposalVerifier())
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it("verifyProposal: should allow the governor to verify a valid proof, emit event and store the nullifier and content hash", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        const tx = await proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            validRoot);

        await expect(tx).to.emit(proposalManager, "ProofVerified")
            .withArgs(ProofContextHash, ProofProposalNullifier, ProofContentHash);
        // Check if the nullifier and content hash are stored correctly
        expect(await proposalManager.connect(governor).getProposalNullifierStatus(ProofProposalNullifier)).to.equal(true);
        expect(await proposalManager.connect(governor).getProposalSubmission(validContextKey)).to.equal(ProofContentHash);
 
    });

    it("verifyProposal: should not allow the governor to verify a proof with a root different than the current root", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await expect(proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            rootHash)).to.be.revertedWithCustomError(proposalManager, "InvalidMerkleRoot");
    });

    it("verifyProposal: should not allow the governor to verify a proof for a group with a non-initialized root", async function () {
        await expect(proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            ethers.ZeroHash)).to.be.revertedWithCustomError(
                proposalManager, 
                "RootNotYetInitialized");
    });

    it("verifyProposal: should not allow the governor to verify a proof with a used nullifier", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            validRoot);
        await expect(proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            validRoot)).to.be.revertedWithCustomError(proposalManager, "NullifierAlreadyUsed");
    });

    it("verifyProposal: should not allow the governor to verify a proof with an invalid context key", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await expect(proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            contextKey, // Invalid context key
            validRoot)).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it("verifyProposal: should not allow non-governor to verify a valid proof", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await expect(proposalManager.connect(user1).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            validRoot)).to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it("getProposalNullifierStatus: should not allow non-governor to check the status of a proposal nullifier", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            validRoot);
        await expect(proposalManager.connect(user1).getProposalNullifierStatus(ProofProposalNullifier))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });

    it("getProposalSubmission: should not allow non-governor to check the proposal submission for a context key", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validContextKey,
            validRoot);
        await expect(proposalManager.connect(user1).getProposalSubmission(validContextKey))
            .to.be.revertedWithCustomError(proposalManager, "OwnableUnauthorizedAccount");
    });


});