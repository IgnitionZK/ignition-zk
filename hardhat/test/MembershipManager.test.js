const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils.js");

describe("Membership Manager Unit Tests:", function () {

    // Managers
    let MembershipManager;
    let membershipManager;

    // Verifiers
    let MembershipVerifier;
    let membershipVerifier;
    let MockMembershipVerifier;
    let mockMembershipVerifier;

    // NFT Implementation
    let NFTImplementation;
    let nftImplementation;

    // Mock Attacker ERC721
    let MockAttackerERC721;
    let mockAttackerERC721;

    let deployer;
    let governor;
    let relayer; 
    let user1;

    let groupId;
    let groupId2;
    let groupKey;
    let groupKey2;
    let rootHash;
    let rootHash2;

    let nftName;
    let nftSymbol;
    let nftName2;
    let nftSymbol2;

    let realGroupId;
    let realGroupKey;
    let realRoot;
    let realProof;
    let realPublicSignals;
    let proofRoot;
    let proofGroupHash;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, governor, relayer, user1] = await ethers.getSigners();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  

        // Get Contract Factory for MembershipVerifier
        MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");

        // Get Contract Factory for MockMembershipVerifier
        MockMembershipVerifier = await ethers.getContractFactory("MockMembershipVerifier");
        
        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");

        // Get Contract Factory for MockAttackerERC721
        MockAttackerERC721 = await ethers.getContractFactory("MockAttackerERC721");

        // Initialize variables
        groupId = '123e4567-e89b-12d3-a456-426614174000'; 
        groupKey = Conversions.stringToBytes32(groupId);
        groupId2 = '123e4567-e89b-12d3-a456-426614174001'; 
        groupKey2 = Conversions.stringToBytes32(groupId2);
        rootHash = Conversions.stringToBytes32("rootHash");
        rootHash2 = Conversions.stringToBytes32("newRootHash");
        nftName = "Test Group NFT";
        nftSymbol = "TG1";  
        nftName2 = "Test Group NFT 2";
        nftSymbol2 = "TG2";  

        // invalid proof inputs:
        
        mockProof = [
            1, 2, 3, 4, 5, 6,
            7, 8, 9, 10, 11, 12,
            13, 14, 15, 16, 17, 18,
            19, 20, 21, 22, 23, 24
        ];
        mockPublicSignals1 = [
            rootHash,
            groupKey
        ];
        mockPublicSignals2 = [
            rootHash2,
            groupKey
        ];
       
        // Real membership proof inputs 
        realGroupId = '21fae0f7-096f-4c8f-8515-93b9f247582d';
        realGroupKey = Conversions.stringToBytes32(realGroupId);
        realRoot = ethers.toBeHex(8382028473019880437532291517957501217880306914202305497790783762876650668442n);
        realProof =  [           
            14852185387147588968196183267888932970562245291707382385535882948222286854746n,
            2605810935074760586177942025101594944905166763428271699569635356100663752828n,
            15285281757244001062041009699022322994728899259765252894879600758526569759782n,
            17790860735671041998343898338032116782378492738445928570540667969871981684474n,
            14109817763688371830838443181397713200548953627942793522585990893207182926391n,
            14469491624057854258037084962069419357690070350511186871794058808483393982518n,
            20457989049586389633617021239939725544043137313310590389213648209720645472811n,
            6529501368977311358476414407045080130025945576059290514681009670747874853874n,
            10752733968440350211263769186700227123421141136931711387797412697817956291979n,
            7354266079914592595559053244760281643882910353788950081322381980621326729475n,
            1101817184593364996597693385984888782889652823871694359125652288005733135072n,
            509969332025856222621244651961094983360622686807835992331956569756953262159n,
            7816194575565064184881898795934207388442388429436615895200428407448354957785n,
            9123373533038457295512098253834660294862409442386242856201350793059219339666n,
            18980647723923850857133924832957360451482388152395959794418728234868104550317n,
            15990176552532768502453414348532054681187523221551071207478358829564827426991n,
            2372394654205646031573781628023381435922449231018155794248502332097974348010n,
            21244530957900490929643461746919128415281732299610677840752861795458266010092n,
            20018688137368020604627597778694575728924706999283112515011956355034274529849n,
            14971606317008914026441480378823259818517031921339003910533105722205636476362n,
            5512174821905863064194279991238238206920914113931557936457222895352342548595n,
            6036444752706746130112014113429671088794176588854788207169735120998413611519n,
            15170380335124550399812740412692772209285854613055633668856659387558767374871n,
            17857832887917614917816887522404328641855162998495953719914341462557986046769n
        ];

        realPublicSignals = [
            8382028473019880437532291517957501217880306914202305497790783762876650668442n,
            2506629824618881676752327261089047969196809530490426743986964496311875247831n
        ];
        proofRoot = ethers.toBeHex(realPublicSignals[0], 32);
        proofGroupHash = ethers.toBeHex(realPublicSignals[1], 32);
    });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {
        
        // Deploy the NFT implementation minimal proxy (Clones EIP‑1167) contract
        nftImplementation = await NFTImplementation.deploy();
        await nftImplementation.waitForDeployment();

        // Deploy the MembershipVerifier contract
        membershipVerifier = await MembershipVerifier.deploy();
        await membershipVerifier.waitForDeployment();

        // Deploy the MockMembershipVerifier contract
        mockMembershipVerifier = await MockMembershipVerifier.deploy();
        await mockMembershipVerifier.waitForDeployment();

        // Deploy the MembershipManager UUPS Proxy (ERC‑1967) contract
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
  
        // Deploy MockAttackerERC721 contract
        mockAttackerERC721 = await MockAttackerERC721.deploy(membershipManager.target, groupKey);
        await mockAttackerERC721.waitForDeployment();
    });

    async function deployGroupNftAndSetRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).setRoot(root, group);
    }

    async function deployNft_MintToMember_getClone(signer, groupKey, nftName, nftSymbol) {
        // deploy group NFT and mint NFT to user1
        await membershipManager.connect(signer).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(signer).mintNftToMember(user1.getAddress(), groupKey);
        const receipt = await tx.wait();
        
        // get the address of the deployed NFT contract
        // and attach the NFT implementation to it so we can interact with it
        const cloneAddress = await membershipManager.connect(signer).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        return { clone, receipt };
    }

    // TEST CASES

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy NFTImplementation, MembershipManager contracts`, async function () {
        expect(membershipManager.target).to.be.properAddress;
        expect(nftImplementation.target).to.be.properAddress;
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner of MembershipManager`, async function () {
        expect(await membershipManager.owner()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  onlyOwner(), transferOwnership()
        EXPECTED: should allow the governor to transfer ownership of the membership manager`, async function () {
        const newOwner = await user1.getAddress();
        await expect(membershipManager.connect(governor).transferOwnership(newOwner))
            .to.emit(membershipManager, "OwnershipTransferred")
            .withArgs(await governor.getAddress(), newOwner);
        const updatedOwner = await membershipManager.owner();
        expect(updatedOwner).to.equal(newOwner, "MembershipManager owner should be updated to user1");
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  onlyOwner(), transferOwnership()
        EXPECTED: should not allow non-governor to transfer ownership of the membership manager`, async function () {
        const newOwner = await user1.getAddress();
        await expect(
            membershipManager.connect(user1).transferOwnership(newOwner)
        ).to.be.revertedWithCustomError(
            membershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

     it(`ACCESS CONTROL: ownership
        TESTING:  error: OwnableInvalidOwner, transferOwnership()
        EXPECTED: should not allow governor to transfer ownership to the zero address`, async function () {
        await expect(membershipManager.connect(governor).transferOwnership(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(membershipManager, "OwnableInvalidOwner");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to upgrade the membership manager contract`, async function () {
        const proxyAddress = await membershipManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        const MockMembershipManagerV2 = await ethers.getContractFactory("MockMembershipManagerV2", { signer: governor });
        const mockMembershipManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            MockMembershipManagerV2, 
            {
                kind: "uups"
            }
        );
        await mockMembershipManagerV2.waitForDeployment();
        const upgradedAddress = await mockMembershipManagerV2.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to upgrade the membership manager contract`, async function () {
        const proxyAddress = await membershipManager.target;
        const MockMembershipManagerV2 = await ethers.getContractFactory("MockMembershipManagerV2", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            proxyAddress,
            MockMembershipManagerV2,
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(membershipManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: proxy data storage
        EXPECTED: should preserve proxy data after upgrade`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // check that the root for the groupKey is stored correctly
        expect(await membershipManager.connect(governor).getRoot(groupKey)).to.equal(rootHash);

        // get the current proxy address and implementation address
        const proxyAddress = await membershipManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the membership manager contract to a new version
        const MockMembershipManagerV2 = await ethers.getContractFactory("MockMembershipManagerV2", { signer: governor });
        const mockMembershipManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            MockMembershipManagerV2, 
            {
                kind: "uups"
            }
        );
        await mockMembershipManagerV2.waitForDeployment();

        const upgradedAddress = await mockMembershipManagerV2.target;

        // Check if the root is still stored correctly after the upgrade
        expect(await mockMembershipManagerV2.connect(governor).getRoot(groupKey)).to.equal(rootHash, "Root should remain the same after upgrade");

    });

    
    it(`FUNCTION: setMembershipVerifier
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to set the membership verifier to the zero address`, async function () {
        await expect(membershipManager.connect(governor).setMembershipVerifier(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(membershipManager, "AddressCannotBeZero");
    });

    it(`FUNCTION: setMembershipVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to set the membership verifier`, async function () {
        await membershipManager.connect(governor).setMembershipVerifier(membershipVerifier.target);
        expect(await membershipManager.connect(governor).getMembershipVerifier()).to.equal(membershipVerifier.target);
    });

    it(`FUNCTION: setMembershipVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to set the membership verifier`, async function () {
        await expect(membershipManager.connect(user1).setMembershipVerifier(membershipVerifier.target))
            .to.be.revertedWithCustomError(membershipManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setMembershipVerifier
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the governor to set the membership verifier to an address that is not a contract`, async function () {
        await expect(membershipManager.connect(governor).setMembershipVerifier(user1.address))
            .to.be.revertedWithCustomError(membershipManager, "AddressIsNotAContract");
    });

    it(`FUNCTION verifyMembership (with mock membership verifier): 
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proof with an invalid context key`, async function () {
        
        const invalidKey = Conversions.stringToBytes32("invalidGroupKey");

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, invalidKey, nftName, nftSymbol, rootHash);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);
        
        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockPublicSignals1,
            invalidKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidGroupKey");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a membership with a root different than the current root`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockPublicSignals2,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidMerkleRoot");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: custom error: RootNotYetInitialized
        EXPECTED: should not allow the governor to verify membership for a group with a non-initialized root`, async function () {

        // deploy group NFT without initializing the root
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "RootNotYetInitialized");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: onlyOwner authorization
        EXPECTED: should not allow non-governor to verify membership`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        await expect(membershipManager.connect(user1).verifyMembership(
            mockProof,
            mockPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: custom error: InvalidProof
        EXPECTED: should not let governor verify membership with an invalid proof`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        // set the mock membership verifier to return an invalid proof
        await mockMembershipVerifier.connect(governor).setIsValid(false);

        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidProof").withArgs(groupKey);
    });

    it(`FUNCTION: verifyMembership (with real verifier, mock proof)
        TESTING: zero proof inputs handling
        EXPECTED: should not allow the governor to verify membership with a zero proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);
        
        const zeroProof = new Array(24).fill(0);

        await expect(membershipManager.connect(governor).verifyMembership(
            zeroProof,
            mockPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidProof").withArgs(groupKey);
    });

    it(`FUNCTION: verifyMembership (with real verifier, valid proof)
        TESTING: event: ProofVerified, stored data: group root
        EXPECTED: should allow the governor to verify membership with a valid proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        await expect(membershipManager.connect(governor).verifyMembership(
            realProof,
            realPublicSignals,
            realGroupKey
        )).to.emit(membershipManager, "ProofVerified").withArgs(realGroupKey);

        const storedRoot = await membershipManager.connect(governor).getRoot(realGroupKey);
        expect(storedRoot).to.equal(realRoot, "Root hash should match the initialized value");

    });

    it(`FUNCTION: verifyMembership (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify membership with a valid proof and an invalid root in the public signals`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // increment the first public signal (root) to make it invalid
        const invalidPublicSignals = [...realPublicSignals];
        invalidPublicSignals[0] = invalidPublicSignals[0] + BigInt(1);

        await expect(membershipManager.connect(governor).verifyMembership(
            realProof,
            invalidPublicSignals,
            realGroupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidMerkleRoot");

    });

    it(`FUNCTION: verifyMembership (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidGroupKey
        EXPECTED: should not allow the governor to verify membership with a valid proof and an invalid group hash in the public signals`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // increment the second public signal (group key) to make it invalid
        const invalidPublicSignals = [...realPublicSignals];
        invalidPublicSignals[1] = invalidPublicSignals[1] + BigInt(1);

        await expect(membershipManager.connect(governor).verifyMembership(
            realProof,
            invalidPublicSignals,
            realGroupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidGroupKey");

    });

    it(`FUNCTION: setRoot
        TESTING: event: RootInitialized, RootSet, stored data: root hash
        EXPECTED: should allow the governor to initialize or set the root of a group and emit event`, async function () {
        
        // Deploy group NFT first
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Initialize root for the group
        await expect(membershipManager.connect(governor).setRoot(rootHash, groupKey))
            .to.emit(membershipManager, "RootInitialized")
            .withArgs(groupKey, rootHash);
        const storedRoot = await membershipManager.connect(governor).getRoot(groupKey);
        expect(storedRoot).to.equal(rootHash, "Root hash should match the initialized value");

        // set a new root for the group
        await expect(membershipManager.connect(governor).setRoot(rootHash2, groupKey))
            .to.emit(membershipManager, "RootSet")
            .withArgs(groupKey, storedRoot, rootHash2);
            
        const updatedRoot = await membershipManager.connect(governor).getRoot(groupKey);
        expect(updatedRoot).to.equal(rootHash2, "Root hash should match the new value");
    });

    it(`FUNCTION: setRoot
        TESTING: authorization: onlyOwner (failure)
        EXPECTED: should not allow a non-governor to set the root of a group`, async function () {

        // Deploy group NFT first
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Initialize root for the group
        await expect(membershipManager.connect(user1).setRoot(rootHash, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager,
                "OwnableUnauthorizedAccount"
            );

    });
        

    it(`FUNCTION: setRoot
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the governor to set the root of a group without an existing deployed group NFT`, async function () {
       
        // Attempt to initialize root for a group without a deployed NFT
        await expect(membershipManager.connect(governor).setRoot(rootHash, groupKey))
            .to.revertedWithCustomError(
                MembershipManager,
                "GroupNftNotSet"
            );
    });

    it(`FUNCTION: setRoot
        TESTING: custom error: RootCannotBeZero
        EXPECTED: should not allow the governor to set the group with a zero root hash`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Attempt to initialize root with a zero hash
        await expect(
            membershipManager.connect(governor).setRoot(ethers.ZeroHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootCannotBeZero"
        );
    });    

    it(`FUNCTION: setRoot
        TESTING: stored data: root hash
        EXPECTED: should store two different root hashes after calling setRoot for two different groups`, async function () {
        
        // Deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);
        await deployGroupNftAndSetRoot(governor, groupKey2, nftName2, nftSymbol2, rootHash2);

        const storedRoot1 = await membershipManager.connect(governor).getRoot(groupKey);
        const storedRoot2 = await membershipManager.connect(governor).getRoot(groupKey2);

        expect(storedRoot1).to.equal(rootHash, "Root hash for groupKey should match the initialized value");
        expect(storedRoot2).to.equal(rootHash2, "Root hash for groupKey2 should match the initialized value");
        expect(storedRoot1).to.not.equal(storedRoot2, "Root hashes for different groups should be different");
    });

    
    it(`FUNCTION: setRoot
        TESTING: custom error: NewRootMustBeDifferent
        EXPECTED: should not allow the governor to set a root that is the same as the current root`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to set the same root again
        await expect(
            membershipManager.connect(governor).setRoot(rootHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "NewRootMustBeDifferent"
        );
    }); 


    it(`FUNCTION: deployGroupNft
        TESTING: event: GroupNftDeployed
        EXPECTED: should allow the governor to deploy a new group NFT and emit event`, async function () {

        await expect(membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol))
            .to.emit(membershipManager, "GroupNftDeployed")
            .withArgs(groupKey, ethers.isAddress, nftName, nftSymbol);

        // Check if the NFT address is stored correctly
        const storedNftAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        expect(storedNftAddress).to.not.equal(ethers.ZeroAddress, "NFT address should not be zero");
        expect(storedNftAddress).to.be.properAddress;
    });

    it(`FUNCTION: deployGroupNft
        TESTING: stored data: group NFT address
        EXPECTED: should allow the governor to deploy two new group NFTs and get their addresses`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).deployGroupNft(groupKey2, nftName2, nftSymbol2);

        // Check if the NFT address is stored correctly
        const storedAddress1 = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const storedAddress2 = await membershipManager.connect(governor).getGroupNftAddress(groupKey2);

        expect(storedAddress1).to.not.equal(ethers.ZeroAddress, "NFT address for groupKey should not be zero");
        expect(storedAddress1).to.be.properAddress;

        expect(storedAddress2).to.not.equal(ethers.ZeroAddress, "NFT address for groupKey2 should not be zero");
        expect(storedAddress2).to.be.properAddress;

        expect(storedAddress1).to.not.equal(storedAddress2, "NFT addresses for different groups should be different");
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftSymbolLength
        EXPECTED: should not allow the governor to deploy a group NFT with an empty symbol length`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName, "")
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "InvalidNftSymbolLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftSymbolLength
        EXPECTED: should not allow the governor to deploy a group NFT with a symbol length longer than 5 characters`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName, "TGNFT123")
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "InvalidNftSymbolLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftNameLength
        EXPECTED: should not allow the governor to deploy a group NFT with an empty name length`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, "", nftSymbol)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "InvalidNftNameLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftNameLength
        EXPECTED: should not allow the governor to deploy a group NFT with a name longer than 32 characters`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, "0123456789012345678901234567890123", nftSymbol)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "InvalidNftNameLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: GroupNftAlreadySet
        EXPECTED: should not allow the governor to deploy a group NFT for an already initialized group`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "GroupNftAlreadySet"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: GroupNftAlreadySet
        EXPECTED: should not allow the governor to deploy a group NFT for an already initialized groupKey but with a different NFT name and symbol`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName2, nftSymbol2)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "GroupNftAlreadySet"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to deploy a group NFT`, async function () {
        await expect(
            membershipManager.connect(user1).deployGroupNft(groupKey, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(MembershipManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: KeyCannotBeZero
        EXPECTED: should not allow the governor to deploy a group NFT with a zero groupKey`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(ethers.ZeroHash, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "KeyCannotBeZero"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: event: MemberNftMinted
        EXPECTED: should allow the governor to mint an NFT to a member and emit event`, async function () {
        // Deploy group NFT first
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Mint NFT to user1
        const user1Address = await user1.getAddress();
        await expect(membershipManager.connect(governor).mintNftToMember(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftMinted")
            .withArgs(groupKey, user1Address, anyUint); // anyUint allows for any uint256 value for the tokenId
    })

    it(`FUNCTION: mintNftToMember
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to mint an NFT to a member with a zero address`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).mintNftToMember(ethers.ZeroAddress, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "AddressCannotBeZero"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the governor to mint an NFT to a member for a group that has not been initialized`, async function () {
        const user1Address = await user1.getAddress();
        // Attempt to mint NFT for a group that has not been initialized
        await expect(
            membershipManager.connect(governor).mintNftToMember(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "GroupNftNotSet"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: custom error: MemberAlreadyHasToken
        EXPECTED: should not allow the governor to mint an NFT to a member if the member already has a token`, async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        
        // Attempt to mint NFT again for the same member
        await expect(
            membershipManager.connect(governor).mintNftToMember(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "MemberAlreadyHasToken"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: custom error: MemberMustBeEOA
        EXPECTED: should not allow the governor to mint an NFT to a member if the member address is a contract`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);	
        
        // Attempt to mint NFT to a contract address
        await expect(
            membershipManager.connect(governor).mintNftToMember(nftImplementation.target, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "MemberMustBeEOA"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to mint an NFT to a member`, async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Attempt to mint NFT by a non-governor
        await expect(
            membershipManager.connect(user1).mintNftToMember(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: Access Control MINTER_ROLE, custom error: AccessControlUnauthorizedAccount
        EXPECTED: should not mint an NFT to a member if the membershipManager revokes the MINTER_ROLE via the governor`, async function () {
        const user1Address = await user1.getAddress();
        // deploy group NFT first
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // get the address of the deployed NFT contract
        // and attach the NFT implementation to it so we can interact with it
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        
        // Revoke MINTER_ROLE from the membershipManager
        await membershipManager.connect(governor).revokeMinterRole(cloneAddress);
        
        // Attempt to mint NFT after revoking MINTER_ROLE
        await expect(
            membershipManager.connect(governor).mintNftToMember(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            clone,
            "AccessControlUnauthorizedAccount"
        );
    });

    it(`FUNCTION: mintNftToMember
        TESTING: Access Control MINTER_ROLE
        EXPECTED: should allow the governor to mint an NFT to a member after re-granting the MINTER_ROLE`, async function () {
        // deploy group NFT 
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // get the address of the deployed NFT contract
        // and attach the NFT implementation to it so we can interact with it
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        
        // Revoke MINTER_ROLE from the membershipManager
        await membershipManager.connect(governor).revokeMinterRole(cloneAddress);

        // Attempt to mint NFT after revoking MINTER_ROLE
        const user1Address = await user1.getAddress();
        await expect(
            membershipManager.connect(governor).mintNftToMember(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            clone,
            "AccessControlUnauthorizedAccount"
        );

        // Re-grant MINTER_ROLE to the membershipManager
        await membershipManager.connect(governor).grantMinterRole(cloneAddress, membershipManager.target);

        // Mint NFT after re-granting MINTER_ROLE
        await expect(membershipManager.connect(governor).mintNftToMember(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftMinted")
            .withArgs(groupKey, user1Address, anyUint); // anyUint allows for any uint256 value for the tokenId
    });

    /*
    it("mintNftToMember: should not allow reentrancy attack on minting NFT", async function () {
        const user1Address = await user1.getAddress();
        const attackerAddress = await attackerERC721.getAddress();
        console.log("Attacker Address:", attackerAddress);
        await membershipManager.connect(governor).setGroupNftAddress(groupKey, attackerAddress);
        const checkAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        console.log("Check Address:", checkAddress);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
    });
    */

    it(`FUNCTION: mintNftToMembers
        TESTING: custom error: NoMembersProvided
        EXPECTED: should not let governor mint NFTs to an empty array`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        const members = [];
        await expect(
            membershipManager.connect(governor).mintNftToMembers(members, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "NoMembersProvided"
        );

    });

    it(`FUNCTION: mintNftToMembers
        TESTING: custom error: MemberBatchTooLarge
        EXPECTED: should not let governor mint NFTs to an array larger than the max batch size`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Create an array with 31 members, which exceeds the max batch size of 30
        const members = Array.from({ length: 31 }, () => ethers.Wallet.createRandom().address);

        // Attempt to mint NFTs to the array of members
        await expect(
            membershipManager.connect(governor).mintNftToMembers(members, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "MemberBatchTooLarge"
        );

    });

    it(`FUNCTION: mintNftToMembers
        TESTING: number of emitted events: MemberNftMinted, addresses in emitted events
        EXPECTED: should let governor mint NFTs to an array with 10 members`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Create an array with 10 members
        const members = Array.from({ length: 10 }, () => ethers.Wallet.createRandom().address);
        
        // Mint NFTs to the array of members
        const tx = await membershipManager.connect(governor).mintNftToMembers(members, groupKey);
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
        const MemberNftMintedEvent = parsedEvents.filter((event) => event && event.name === "MemberNftMinted");
        
        // should have emitted 10 MemberNftMinted events
        const numEvents = MemberNftMintedEvent.length;
        expect(numEvents).to.equal(10, "Should have minted NFTs to 10 members");

        // check that the addresses in the events match the members array
        const eventAddresses = [];
        for(const event of MemberNftMintedEvent) {
            eventAddresses.push(event.args[1]);
        }
        
        expect(members).to.deep.equal(eventAddresses, "Minted addresses should match the provided members");
    });

    it(`FUNCTION: mintNftToMembers
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not let non-governor mint NFTs to an array with 10 members`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Create an array with 10 members
        const members = Array.from({ length: 10 }, () => ethers.Wallet.createRandom().address);
        
        // Mint NFTs to the array of members
        const tx = await membershipManager.connect(governor).mintNftToMembers(members, groupKey);

        await expect(
            membershipManager.connect(user1).mintNftToMembers(members, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: mintNftToMembers
        TESTING: 
        EXPECTED: should let governor mint NFTs to an array with the max batch size`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Create an array with 30 members
        const members = Array.from({ length: 30 }, () => ethers.Wallet.createRandom().address);
        
        for(let i= 0; i < members.length; i++) {
            const currAddress = members[i];
            for(let j=0; j < members.length; j++) {
                if(currAddress === members[j] && i != j) {
                    return console.log("Duplicate address found in members array at index", i, "and", j);
                }
            }
        }
    
        await expect(
            membershipManager.connect(governor).mintNftToMembers(members, groupKey)
        ).to.emit(membershipManager, "MemberNftMinted").withArgs(groupKey, members[0], anyUint);

    });

    it(`FUNCTION: burnMemberNft
        TESTING: event: MemberNftBurned
        EXPECTED: should allow the governor to burn a member's NFT and emit event`, async function () {
        // deploy group NFT 
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Mint NFT to user1
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

        // Burn NFT for user1
        await expect(membershipManager.connect(governor).burnMemberNft(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftBurned")
            .withArgs(groupKey, user1Address, anyUint);
    });

    it(`FUNCTION: burnMemberNft
        TESTING: custom error: MemberDoesNotHaveToken
        EXPECTED: should not allow the governor to burn a member's NFT if the member does not have a token`, async function () {
        // deploy group NFT 
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Attempt to burn NFT for a member that does not have a token
        await expect(
            membershipManager.connect(governor).burnMemberNft(user1.getAddress(), groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "MemberDoesNotHaveToken"
        );
    });

    it(`FUNCTION: burnMemberNft
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to burn an NFT at address zero`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Cannot mint NFT to address zero so cannot burn it
        await expect(membershipManager.connect(governor).mintNftToMember(ethers.ZeroAddress, groupKey)).to.be.revertedWithCustomError(
            MembershipManager,
            "AddressCannotBeZero"
        );
    });

    it(`FUNCTION: burnMemberNft
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to burn a member's NFT`, async function () {
        
        // deploy group NFT and mint NFT to user1
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1.getAddress(), groupKey);
        
        // Attempt to burn NFT by a non-governor
        await expect(
            membershipManager.connect(user1).burnMemberNft(user1.getAddress(), groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: burnMemberNft
        TESTING: Access Control BURNER_ROLE, custom error: AccessControlUnauthorizedAccount
        EXPECTED: should not allow the membershipManager to burn a member's NFT if the governor revokes the BURNER_ROLE`, async function () {
        const user1Address = await user1.getAddress();
        
        // deploy group NFT and mint NFT to user1
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

        // get the address of the deployed NFT contract
        // and attach the NFT implementation to it so we can interact with it
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Revoke BURNER_ROLE from the membershipManager
        await membershipManager.connect(governor).revokeBurnerRole(cloneAddress);

        // Attempt to burn NFT after revoking BURNER_ROLE
        await expect(
            membershipManager.connect(governor).burnMemberNft(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            clone,
            "AccessControlUnauthorizedAccount"
        );
    });

    it(`FUNCTION: burnMemberNft
        TESTING: Access Control BURNER_ROLE
        EXPECTED: should allow the membershipManager to burn a member's NFT after re-granting the BURNER_ROLE`, async function () {
        const user1Address = await user1.getAddress();

        // deploy group NFT and mint NFT to user1
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

        // get the address of the deployed NFT contract
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Revoke BURNER_ROLE from the membershipManager
        await membershipManager.connect(governor).revokeBurnerRole(cloneAddress);

        // Attempt to burn NFT after revoking BURNER_ROLE
        await expect(
            membershipManager.connect(governor).burnMemberNft(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            clone,
            "AccessControlUnauthorizedAccount"
        );

        // Re-grant BURNER_ROLE to the membershipManager
        await membershipManager.connect(governor).grantBurnerRole(cloneAddress, membershipManager.target);

        // Burn NFT after re-granting BURNER_ROLE
        await expect(membershipManager.connect(governor).burnMemberNft(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftBurned")
            .withArgs(groupKey, user1Address, anyUint); 
    });

    it(`FUNCTIONALITY: NFT transfer
        TESTING: Soulbound NFT transfer restrictions (transferFrom()), custom error: TransferNotAllowed
        EXPECTED: should not allow the owner of the NFT (EOA) to transfer it`, async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();

        // deploy group NFT, mint NFT to user1 and get clone address
        const { clone, receipt }  = await deployNft_MintToMember_getClone(governor, groupKey, nftName, nftSymbol)

        // get tokenId from the event within the logs
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = membershipManager.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const MemberNftMintedEvent = parsedEvents.find((event) => event && event.name === "MemberNftMinted");
        const tokenId = MemberNftMintedEvent.args[2];

        // Attempt to transfer the NFT by the owner
        await expect(
            clone.connect(user1).transferFrom(user1Address, deployerAddress, tokenId)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it(`FUNCTIONALITY: NFT transfer
        TESTING: Soulbound NFT transfer restrictions (approve()), custom error: TransferNotAllowed
        EXPECTED: should not allow the owner of the NFT to approve another EOA address to transfer it`, async function () {
        const deployerAddress = await deployer.getAddress();

        // deploy group NFT, mint NFT to user1 and get clone address
        const { clone } = await deployNft_MintToMember_getClone(governor, groupKey, nftName, nftSymbol)
        // Attempt to approve another address to transfer the NFT by the owner
        await expect(
            clone.connect(user1).approve(deployerAddress, 0)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it(`FUNCTIONALITY: NFT transfer
        TESTING: Soulbound NFT transfer restrictions (setApprovalForAll()), custom error: TransferNotAllowed
        EXPECTED: should not allow the owner of the NFT (EOA) to set approval for all`, async function () {
        
        // deploy group NFT, mint NFT to user1 and get clone address
        const deployerAddress = await deployer.getAddress();
        const { clone } = await deployNft_MintToMember_getClone(governor, groupKey, nftName, nftSymbol)

        // Attempt to set approval for all by the owner
        await expect(
            clone.connect(user1).setApprovalForAll(deployerAddress, true)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it(`FUNCTIONALITY: NFT transfer
        TESTING: Soulbound NFT transfer restrictions (transferTo()), custom error: TransferNotAllowed
        EXPECTED: should not allow the owner of the NFT to transfer it to a contract address`, async function () {
        
        // deploy group NFT, mint NFT to user1 and get clone address
        const user1Address = await user1.getAddress();
        const { clone } = await deployNft_MintToMember_getClone(governor, groupKey, nftName, nftSymbol)

        // Attempt to transfer the NFT to a contract address by the owner
        await expect(
            clone.connect(user1).transferFrom(user1Address, nftImplementation.target, 0)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it(`FUNCTIONALITY: NFT transfer
        TESTING: Soulbound NFT transfer restrictions (approve()), custom error: TransferNotAllowed
        EXPECTED: should not allow the owner of the NFT to approve a contract address to transfer it`, async function () {
    
        // deploy group NFT, mint NFT to user1 and get clone address
        const { clone } = await deployNft_MintToMember_getClone(governor, groupKey, nftName, nftSymbol)

        // Attempt to approve a contract address to transfer the NFT by the owner
        await expect(
            clone.connect(user1).approve(nftImplementation.target, 0)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it(`FUNCTIONALITY: NFT transfer
        TESTING: Soulbound NFT transfer restrictions (setApprovalForAll()), custom error: TransferNotAllowed
        EXPECTED: should not allow the owner of the NFT (EOA) to set approval for all for a contract address`, async function () {
       // deploy group NFT, mint NFT to user1 and get clone address
       const { clone } = await deployNft_MintToMember_getClone(governor, groupKey, nftName, nftSymbol)

       // Attempt to set approval for all for a contract address by the owner
       await expect(
           clone.connect(user1).setApprovalForAll(nftImplementation.target, true)
       ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it(`FUNCTION: getRoot
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to get the root for an existing group`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to get root by a non-governor
        await expect(
            membershipManager.connect(user1).getRoot(groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: getRoot
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to get the root for an existing group`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to get root by the governor
        expect( await membershipManager.connect(governor).getRoot(groupKey)).to.equal(rootHash, "Should return the correct root hash");
    });

    it(`FUNCTION: getGroupNftAddress
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to get the NFT address for an existing group`, async function () {
        // deploy group NFT
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Attempt to get NFT address by a non-governor
        await expect(
            membershipManager.connect(user1).getGroupNftAddress(groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: getGroupNftAddress
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to get the NFT address for an existing group`, async function () {
        // deploy group NFT
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Attempt to get NFT address by the governor
        expect( await membershipManager.connect(governor).getGroupNftAddress(groupKey)).to.be.properAddress;
    });

    it(`FUNCTION: getNftImplementation
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to get the NFT implementation address`, async function () {
        
        await expect(membershipManager.connect(user1).getNftImplementation()).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );  
    });

    it(`FUNCTION: getNftImplementation
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to get the NFT implementation address`, async function () {
        
        expect(await membershipManager.connect(governor).getNftImplementation()).to.equal(
            nftImplementation.target,
            "Should return the correct NFT implementation address"
        );
    });

    it(`FUNCTION: getMaxMembersBatch
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to get the max members batch`, async function () {

        expect(await membershipManager.connect(governor).getMaxMembersBatch()).to.equal(
            30,
            "Should return the correct max members batch"
        );
    });

    it(`FUNCTION: getMaxMembersBatch
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-governor to get the max members batch`, async function () {

        await expect(membershipManager.connect(user1).getMaxMembersBatch()).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: getContractVersion
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to view the current contract version`, async function () {
        expect(await membershipManager.connect(governor).getContractVersion()).to.equal(
            "MembershipManager v1.0.0",
            "Should return the correct contract version"
        );
    });

});

