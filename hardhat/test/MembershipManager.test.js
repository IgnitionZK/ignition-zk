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

        /*
        //valid proof inputs:
        validUuid = 'bf56d8b4-618e-4bfe-a2b8-0ebeb9c06d2f';
        validGroupKey = Conversions.stringToBytes32(validUuid);
        validProof = [12723661512181512564133082958539708051764952847649598922160420109792300741443n, 15144361789550256843213075442927675468301954095924989815572321543713978227405n, 20270241392072168651438981133015416857602620598228701171817367774149618707468n, 4877456838660641332552184869109646996849294253004601609722208324042182098323n, 7261302575944315335843096330984291989534135790958415582300303855324013463434n, 17059939722681569876256023347311823572921555744783998865164128382959626172145n, 7449812983458737162776414980469547753644179222330696758981954226362759896882n, 10641421991359777901645242057672314113508631588884595909434388382237270021042n, 8876545890956321689446937191990903233582151554274653346292321937218277735584n, 3232224451609947834030577364646852979186824344325814820658751382295022002609n, 15964517761502927109299580134898520178176602897264081752509669515597702971814n, 21327182056006907161993883660696141865439046282159120725544845334922879278512n, 5361424725479157736413749383892726192053575425379500041241859501321251694476n, 17176015431443966048798739122305704455241223246261369322520892889973458270759n, 6472703655794652942567937422607903202651431634440030267562054789208020802048n, 17853559276152903276580215583902666950583551268253317580804436259152081841595n, 2478953388483023827812125619291476215465981049997786458697965607114959329747n, 13141686118219066901415421631920655181647708375873492850896836919877162647752n, 11411653162361138979989496693359129693880302138759332371037625874759743592395n, 7313684787946033708167892955359776119332991829670241610649748716029130490962n, 8730455425146887748876442529024890142752884755295966778983612828082865721439n, 7770269715349474167628620377544317787776637453366262357647343096731021446733n, 1840877294611034491185769928004348947501764941250083195301027481432841028883n, 15488884326484369161640536983044185418987833369312485600337930258641160429544n]
        validPublicSignals = [14625843210609328628808221693020936775910419632505608599170019946391716016853n, 21284411868483133640015840002243641200058418874841859199644495183871744595557n, 20347671511505755995800787811739622923322848038570576685329506851648789567890n]
        validPublicNullifier = ethers.toBeHex(validPublicSignals[0], 32);
        validRoot = ethers.toBeHex(validPublicSignals[1], 32);
        validExternalNullifier = ethers.toBeHex(validPublicSignals[2], 32);
        
        */
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

    async function deployGroupNftAndInitRoot(signer, group, nftName, nftSymbol, root) {
        // Deploy group NFT and initialize group root
        await membershipManager.connect(signer).deployGroupNft(group, nftName, nftSymbol);
        await membershipManager.connect(signer).initRoot(root, group);
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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

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

    it(`FUNCTION: setMembershipVerifier
        TESTING: custom error: AddressDoesNotSupportInterface
        EXPECTED: should not allow the governor to set the membership verifier to an address not implementing the IMembershipVerifier interface`, async function () {
        await expect(membershipManager.connect(governor).setMembershipVerifier(membershipManager.target))
            .to.be.revertedWithCustomError(membershipManager, "AddressDoesNotSupportInterface");
    });

    it(`FUNCTION verifyMembership (with mock membership verifier): 
        TESTING: custom error: InvalidContextHash
        EXPECTED: should not allow the governor to verify a proof with an invalid context key`, async function () {
        
        const invalidKey = Conversions.stringToBytes32("invalidGroupKey");

        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, invalidKey, nftName, nftSymbol, rootHash);

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);
        
        const zeroProof = new Array(24).fill(0);

        await expect(membershipManager.connect(governor).verifyMembership(
            zeroProof,
            mockPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidProof").withArgs(groupKey);
    });

    it(`FUNCTION: initRoot
        TESTING: event: RootInitialized, stored data: root hash
        EXPECTED: should allow the governor to initialize the root of a group and emit event`, async function () {
        
        // Deploy group NFT first
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Initialize root for the group
        await expect(membershipManager.connect(governor).initRoot(rootHash, groupKey))
            .to.emit(membershipManager, "RootInitialized")
            .withArgs(groupKey, rootHash);
        const storedRoot = await membershipManager.connect(governor).getRoot(groupKey);
        expect(storedRoot).to.equal(rootHash, "Root hash should match the initialized value");
    });

    it(`FUNCTION: initRoot
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the governor to initialize the root of a group without an existing deployed group NFT`, async function () {
       
        // Attempt to initialize root for a group without a deployed NFT
        await expect(membershipManager.connect(governor).initRoot(rootHash, groupKey))
            .to.revertedWithCustomError(
                MembershipManager,
                "GroupNftNotSet"
            );
    });

    it(`FUNCTION: initRoot
        TESTING: custom error: RootAlreadyInitialized
        EXPECTED: should not allow the governor to initialize the root of the same group again`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to re-initialize the group with a different root hash
        await expect(
            membershipManager.connect(governor).initRoot(rootHash2, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootAlreadyInitialized"
        );
    });

    it(`FUNCTION: initRoot
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to initialize the root of a group`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Attempt to initialize root by a non-governor
        await expect(
            membershipManager.connect(user1).initRoot(rootHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: initRoot
        TESTING: custom error: RootCannotBeZero
        EXPECTED: should not allow the governor to initialize the group with a zero root hash`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        
        // Attempt to initialize root with a zero hash
        await expect(
            membershipManager.connect(governor).initRoot(ethers.ZeroHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootCannotBeZero"
        );
    });    

    it(`FUNCTION: initRoot
        TESTING: stored data: root hash
        EXPECTED: should store two different root hashes after calling initRoot for two different groups`, async function () {
        
        // Deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);
        await deployGroupNftAndInitRoot(governor, groupKey2, nftName2, nftSymbol2, rootHash2);

        const storedRoot1 = await membershipManager.connect(governor).getRoot(groupKey);
        const storedRoot2 = await membershipManager.connect(governor).getRoot(groupKey2);

        expect(storedRoot1).to.equal(rootHash, "Root hash for groupKey should match the initialized value");
        expect(storedRoot2).to.equal(rootHash2, "Root hash for groupKey2 should match the initialized value");
        expect(storedRoot1).to.not.equal(storedRoot2, "Root hashes for different groups should be different");
    });


    it(`FUNCTION: setRoot
        TESTING: event: RootSet, stored data: root hash
        EXPECTED: should allow the governor to set a new root for an existing group and emit event`, async function () {
        
        // Deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Set a new root for the group
        await expect(membershipManager.connect(governor).setRoot(rootHash2, groupKey))
            .to.emit(membershipManager, "RootSet")
            .withArgs(groupKey, rootHash, rootHash2);
        
        // Check if the root has been updated
        const storedRoot = await membershipManager.connect(governor).getRoot(groupKey);
        expect(storedRoot).to.equal(rootHash2, "Root hash should match the new value");
    });

    it(`FUNCTION: setRoot
        TESTING: stored data: root hash
        EXPECTED: should store the new root hash after calling setRoot a second time`, async function () {
        
        // Deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Set a new root for the group
        await membershipManager.connect(governor).setRoot(rootHash2, groupKey);

        // Check if the root has been updated
        expect(await membershipManager.connect(governor).getRoot(groupKey)).to.equal(rootHash2, "Root hash should match the new value");

        // Set another new root for the group
        const newRootHash = Conversions.stringToBytes32("anotherNewRootHash");
        await membershipManager.connect(governor).setRoot(newRootHash, groupKey);

        // Check if the root has been updated again
        expect(await membershipManager.connect(governor).getRoot(groupKey)).to.equal(newRootHash, "Root hash should match the new value");
    });

    
    it(`FUNCTION: setRoot
        TESTING: custom error: RootNotYetInitialized
        EXPECTED: should not allow the governor to set a new root for a group that has not been initialized`, async function () {
        // deploy group NFT without initializing root
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Attempt to set root for a group without an initialized root
        await expect(
            membershipManager.connect(governor).setRoot(rootHash2, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootNotYetInitialized"
        );
    });

    it(`FUNCTION: setRoot
        TESTING: custom error: RootCannotBeZero
        EXPECTED: should not allow the governor to set a zero root hash for an existing group`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to set root with a zero hash
        await expect(
            membershipManager.connect(governor).setRoot(ethers.ZeroHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootCannotBeZero"
        );
    });

    it(`FUNCTION: setRoot
        TESTING: custom error: NewRootMustBeDifferent
        EXPECTED: should not allow the governor to set a root that is the same as the current root`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to set the same root again
        await expect(
            membershipManager.connect(governor).setRoot(rootHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "NewRootMustBeDifferent"
        );
    }); 

    it(`FUNCTION: setRoot
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to set a new root for an existing group`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

        // Attempt to set root by a non-governor
        await expect(
            membershipManager.connect(user1).setRoot(rootHash2, groupKey)
        ).to.be.reverted;
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

    /*
    it("verifyProof: should not allow the governor to verify an invalid proof", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        await expect(membershipManager.connect(governor).verifyProof(invalidProof, invalidPublicSignals, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager,
                "InvalidProof"
            )
            .withArgs(groupKey, invalidPublicSignals[0]);
    });

    it("verifyProof: should not allow the governor to verify a proof with an uninitialized group root", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        // Attempt to verify proof without initializing the group root
        await expect(
            membershipManager.connect(governor).verifyProof(invalidProof, invalidPublicSignals, groupKey)
        ).to.be.revertedWithCustomError(
            membershipManager,
            "RootNotYetInitialized"
        );
    });
      
    it("verifyProof: should allow the governor to verify a valid proof and emit event", async function () {
        
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await expect(membershipManager.connect(governor).verifyProof(validProof, validPublicSignals, validGroupKey))
            .to.emit(membershipManager, "ProofVerified")
            .withArgs(validGroupKey, validPublicNullifier);
    });

    it("verifyProof: should store the nullifier after a successful proof verification", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await membershipManager.connect(governor).verifyProof(validProof, validPublicSignals, validGroupKey);
        const nullifier = ethers.toBeHex(validPublicNullifier, 32);
        const isNullifierUsed = await membershipManager.connect(governor).getNullifierStatus(validGroupKey, nullifier);
        expect(isNullifierUsed).to.be.true;
    });

    it("verifyProof: should not allow the governor to verify a proof with an already used nullifier", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await membershipManager.connect(governor).verifyProof(validProof, validPublicSignals, validGroupKey);
        await expect(membershipManager.connect(governor).verifyProof(validProof, validPublicSignals, validGroupKey))
            .to.be.revertedWithCustomError(
                membershipManager,
                "NullifierAlreadyUsed"
            );
    });

    it("verifyProof: should not allow non-governor to verify a proof", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await expect(
            membershipManager.connect(user1).verifyProof(validProof, validPublicSignals, validGroupKey)
        ).to.be.reverted;
    });
    */

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

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
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash);

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

});

