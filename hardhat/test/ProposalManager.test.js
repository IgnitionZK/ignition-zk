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
    let MembershipVerifier;
    let membershipVerifier;
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
    let realRoot;
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
    let realProof
    let realPublicSignals;
    let realClaimProof;
    let realClaimPublicSignals;


    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, governor, relayer, user1] = await ethers.getSigners();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  

        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");

        // Get Contract Factory for MembershipVerifier
        MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");

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
        realGroupId = '21fae0f7-096f-4c8f-8515-93b9f247582d';
        realEpochId = '06134393-4412-4e46-9534-85186ea7bbe8';
        realGroupKey = Conversions.stringToBytes32(realGroupId);
        realEpochKey = Conversions.stringToBytes32(realEpochId);
        realContextKey = await Conversions.computeContextKey(realGroupId, realEpochId);
        realRoot = ethers.toBeHex(8382028473019880437532291517957501217880306914202305497790783762876650668442n);
        realProof =  [
            4160082357726907288154962751768800619364547905185501987938567395992963626756n,
            8625191419888166001787288936525491236965189171168431531580450179034558022628n,
            8663426768450541325893863068057652087373433414669976966805392185357166988298n,
            4370380180872603991303613753283339003660679138439446445411511540846534579473n,
            14535668297481111487584752732259061609062369960463252113342295661612480217875n,
            13464746825577454986616840409467983179939738709257645654324715365483280308240n,
            12482547363391314789048825926158576636653280918225939537422051376247206025379n,
            6425173490738242109124751003607921391818549286250922120905300269803872297520n,
            21867122944002752806844061013556642734340120630422574202220999464430872253739n,
            18303335069190759842167583153896225853680476424013584621050786623335449686685n,
            6227545735508585745608419115002984035075442362970894397791904138026328673325n,
            14382361922826105148392868704816988202231434486726405491561867922774534631091n,
            9552428347965547746691501869392784606122155596379513751104949012052750544211n,
            2302755567771284608940437217367815749744276219766254297504221627205993546298n,
            19871946349315711705904003513613176206359316972300765120626593295263110998032n,
            3323578654821101975665354060651301996026442820081832378114947301446748033323n,
            3010626687343341210674142569935787964497430514255055837156821427657034889090n,
            20814825545369736445078060111030960560292045692197797944294659313624178305723n,
            8809555674879872451626294962074150505479982682178138755219803710877310372357n,
            1551989834106132465664208243483421133538165958314739599389780100567667732048n,
            712496314335736147322087972926575111220098174587906109568858392078735395668n,
            2011994745874617327408216421498351059169876092504697566598493992683855101105n,
            17407614594591813575087546676494537031868753905141623450388448398354606953774n,
            19925841242912817942652827919213205403554809012254685308740983652900643995042n
        ];

        realPublicSignals = [
            10784837327942539940262199572332172861641502897581390099206106957093606019065n,
            11437135861965939255357707860095145538920168988595282139508950839172378710733n,
            18657539368208857675267473580234674446480662122335439399989949196824462772537n,
            8382028473019880437532291517957501217880306914202305497790783762876650668442n,
            4227634804796440866596074335636719855117858676967569745568900499808312409208n
        ];
        proofContextHash = ethers.toBeHex(realPublicSignals[0], 32);
        proofSubmissionNullifier = ethers.toBeHex(realPublicSignals[1], 32);
        proofClaimNullifier = ethers.toBeHex(realPublicSignals[2], 32);
        proofRoot = ethers.toBeHex(realPublicSignals[3], 32);
        proofContentHash = ethers.toBeHex(realPublicSignals[4], 32);

        // Real claim proof inputs (ADD VALUES)
        realClaimProof = [       
            17022331385491674352656711953572521334764478826855946644636639963938221138413n,
            13337814841785982322066856443939408100968278096512154546697259056428429584094n,
            8883627696396774374357596422972368278011072566085500716483555474754647564880n,
            5438389370482609175775618075204450083954805113708375793323243869015057601338n,
            6374740200591525703549142787463554041675631437883820441502575678351557131796n,
            13387079409746748113007800474053907895840107982340179099597766196784974628091n,
            20629616285169984666713518995120722745602095075070123925245113269902058659715n,
            10839288422678664499811083521520036398385931316745759488209591614033422711300n,
            9179551507929582257092430526783606917123042311680961270553288412408483991n,
            4644079564805158252918109860134909564745972357973182387883736159551091614454n,
            4836649542050320363278663492077397639479099273406457765089203615520299906911n,
            14821584109745652907827166850740593603967080112453213443093852511391780831164n,
            8776842109124755821482698920281245695037982148421048179581669504061849457375n,
            17249709923036293211235032073846080957568089077345548342437778640774874525220n,
            12787412407414482081427135293389433704689940515527535533457097261196022783631n,
            5193929429869679588142346251997675979203081582481432677113650182748612673264n,
            5724811214610435675026298931259868477631400132202027438663902112076766389553n,
            10987109609173640378042984797428872255421003208080005028994376853078165031572n,
            13819930228950491354084334551567566975985914459182249330260977602831388358273n,
            10419181180601177277516732109696985589616135635552566285580719655557627216936n,
            19474163458552574499479589850520692943944105435988781409290709534298908192326n,
            11336422004633526528374124157024614104309973643386717948558256508497276422392n,
            15534725659224339149667733889992013871633648659281584426665332857365408128934n,
            7141974369526416983448047383179455418470281347379905821373483403101987276473n
        ];      
        realClaimPublicSignals = [
            18657539368208857675267473580234674446480662122335439399989949196824462772537n,
            11437135861965939255357707860095145538920168988595282139508950839172378710733n,
            10784837327942539940262199572332172861641502897581390099206106957093606019065n
        ];

    });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {

        // Deploy the NFT implementation minimal proxy (Clones EIP‑1167) contract
        nftImplementation = await NFTImplementation.deploy();
        await nftImplementation.waitForDeployment();

        // Deploy the MembershipVerifier contract
        membershipVerifier = await MembershipVerifier.deploy();
        await membershipVerifier.waitForDeployment();

        // Deploy the MembershipMannager UUPS Proxy (ERC‑1967) contract
        membershipManager = await upgrades.deployProxy(
            MembershipManager, 
            [
                await governor.getAddress(),
                nftImplementation.target,
                membershipVerifier.target
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

    it(`FUNCTION: verifyProposal (with real verifier & real proof)
        TESTING: event: SubmissionVerified, stored data: submissionNullifier
        EXPECTED: should allow the governor to verify a proposal with a valid proof`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await expect(proposalManager.connect(governor).verifyProposal(
            realProof,
            realPublicSignals,
            realContextKey,
            realRoot
        )).to.emit(proposalManager, "SubmissionVerified").withArgs(
            proofContextHash,
            proofSubmissionNullifier,
            proofClaimNullifier,
            proofContentHash
        );

        const submissionNullifierStatus = await proposalManager.connect(governor).getSubmissionNullifierStatus(proofSubmissionNullifier);
        expect(submissionNullifierStatus).to.equal(true, "Submission nullifier status should be true after verification");
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid context key in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realPublicSignals];

        // increment the first public signal (context key) to make it invalid
        invalidPublicSignals[0] = invalidPublicSignals[0] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProof,
            invalidPublicSignals,
            realContextKey,
            realRoot
        )).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid submission nullifier in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realPublicSignals];

        // increment the second public signal (submission nullifier) to make it invalid
        invalidPublicSignals[1] = invalidPublicSignals[1] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProof,
            invalidPublicSignals,
            realContextKey,
            realRoot
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(
            realContextKey,
            invalidPublicSignals[1]
        );
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid claim nullifier in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realPublicSignals];

        // increment the third public signal (claim nullifier) to make it invalid
        invalidPublicSignals[2] = invalidPublicSignals[2] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProof,
            invalidPublicSignals,
            realContextKey,
            realRoot
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(
            realContextKey,
            invalidPublicSignals[1]
        );
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid root in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realPublicSignals];

        // increment the 4th public signal (claim nullifier) to make it invalid
        invalidPublicSignals[3] = invalidPublicSignals[3] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProof,
            invalidPublicSignals,
            realContextKey,
            realRoot
        )).to.be.revertedWithCustomError(proposalManager, "InvalidMerkleRoot");
    });

    it(`FUNCTION: verifyProposal (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidSubmissionProof
        EXPECTED: should not allow the governor to verify a proposal with a valid proof array and an invalid content hash in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // change one value in the public signals to make the proof invalid
        const invalidPublicSignals = [...realPublicSignals];

        // increment the 5th public signal (content hash) to make it invalid
        invalidPublicSignals[4] = invalidPublicSignals[4] + BigInt(1);
        
        await expect(proposalManager.connect(governor).verifyProposal(
            realProof,
            invalidPublicSignals,
            realContextKey,
            realRoot
        )).to.be.revertedWithCustomError(proposalManager, "InvalidSubmissionProof").withArgs(
            realContextKey,
            invalidPublicSignals[1]
        );
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

    it(`FUNCTION: verifyProposalClaim (with real verifier & real proof)
        TESTING: event: ClaimVerified, stored data: claimNullifier
        EXPECTED: should allow the governor to verify a proposal claim with a valid proof`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProof,
            realPublicSignals,
            realContextKey,
            realRoot
        );

        const submissionNullifierStatus = await proposalManager.connect(governor).getSubmissionNullifierStatus(proofSubmissionNullifier);
        expect(submissionNullifierStatus).to.equal(true, "Submission nullifier status should be true after verification");

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            realClaimPublicSignals,
            realContextKey
        )).to.emit(proposalManager, "ClaimVerified").withArgs(
            proofContextHash,
            proofClaimNullifier,
            proofSubmissionNullifier
        );

        const claimNullifierStatus = await proposalManager.connect(governor).getClaimNullifierStatus(proofClaimNullifier);
        expect(claimNullifierStatus).to.equal(true, "Claim nullifier status should be true after verification");
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier, real proof, invalid public signals)
        TESTING: custom error: InvalidClaimProof
        EXPECTED: should not allow the governor to verify a proposal claim with a valid proof and an invalid claim nullifier in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProof,
            realPublicSignals,
            realContextKey,
            realRoot
        );

        const invalidClaimPublicSignals = [...realClaimPublicSignals];
        // increment the first public signal (claim nullifier) to make it invalid
        invalidClaimPublicSignals[0] = invalidClaimPublicSignals[0] + BigInt(1);

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            invalidClaimPublicSignals,
            realContextKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidClaimProof").withArgs(
            realContextKey,
            invalidClaimPublicSignals[0],
            proofSubmissionNullifier
        );
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier, real proof, invalid public signals)
        TESTING: custom error: ProposalHasNotBeenSubmitted
        EXPECTED: should not allow the governor to verify a proposal claim with a valid proof and an invalid submission nullifier in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProof,
            realPublicSignals,
            realContextKey,
            realRoot
        );

        // increment the 2nd public signal (submission nullifier) to make it invalid
        const invalidClaimPublicSignals = [...realClaimPublicSignals];
        invalidClaimPublicSignals[1] = invalidClaimPublicSignals[1] + BigInt(1);

        const submissionNullifier = ethers.toBeHex(invalidClaimPublicSignals[1],32);
        const submissionNullifierStatus = await proposalManager.connect(governor).getSubmissionNullifierStatus(submissionNullifier);
        expect(submissionNullifierStatus).to.equal(false, "Submission nullifier status should be false for an invalid submission nullifier");

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            invalidClaimPublicSignals,
            realContextKey
        )).to.be.revertedWithCustomError(proposalManager, "ProposalHasNotBeenSubmitted");
    });

    it(`FUNCTION: verifyProposalClaim (with real verifier, real proof, invalid public signals)
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proposal claim with a valid proof and an invalid context hash in the public signals`, async function () {
        await deployGroupNftAndInitRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);
        await proposalManager.connect(governor).verifyProposal(
            realProof,
            realPublicSignals,
            realContextKey,
            realRoot
        );

        // increment the 3rd public signal (context hash) to make it invalid
        const invalidClaimPublicSignals = [...realClaimPublicSignals];
        invalidClaimPublicSignals[2] = invalidClaimPublicSignals[2] + BigInt(1);

        await expect(proposalManager.connect(governor).verifyProposalClaim(
            realClaimProof,
            invalidClaimPublicSignals,
            realContextKey
        )).to.be.revertedWithCustomError(proposalManager, "InvalidContextHash");
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