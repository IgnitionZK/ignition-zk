const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("GovernanceManager", function () {
    let MembershipManager;
    let membershipManager;
    let MembershipVerifier;
    let membershipVerifier;
    let NFTImplementation;
    let nftImplementation;
    let AttackerERC721;
    let attackerERC721;
    
    let deployer;
    let relayer; 
    let user1;

    let deployerAddress;
    let relayerAddress;
    let user1Address;

    let groupId;
    let groupKey;
    let rootHash;
    let rootHash2;

    let nftName;
    let nftSymbol;
    let nftName2;
    let nftSymbol2;

    let invalidProof;
    let invalidPublicSignals;

    let validRoot;
    let validProof;
    let validPublicSignals;

    // Convert UUID to group key with prime field modulus
    const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

    /**
     * Convert a UUID to a group key with prime field modulus.
     * @param {string} uuid - The UUID to convert.
     * @returns {string} - The 32-byte hex string representation of the group key.
     */
    function uuidToGroupKey(uuid) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(uuid));
        // Convert the hash to a BigInt and reduce it modulo the prime field
        const reduced = BigInt(hash) % FIELD_MODULUS;
        return ethers.toBeHex(reduced, 32); // Return as a 32-byte hex string
    }

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, relayer, user1] = await ethers.getSigners();
        deployerAddress = await deployer.getAddress();
        relayerAddress = await relayer.getAddress();
        user1Address = await user1.getAddress();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  
        // Get Contract Factory for MembershipManagerVerifier
        MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");
        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");
        // Get Contract Factory for GovernanceManager
        GovernanceManager = await ethers.getContractFactory("GovernanceManager");
        
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
                deployerAddress, // initial owner
                nftImplementation.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await membershipManager.waitForDeployment();
     
        // Deploy the Governance UUPS Proxy (ERC‑1967) contract
        governanceManager = await upgrades.deployProxy(
            GovernanceManager, 
            [
                deployerAddress,  // _initialOwner
                relayerAddress, // _relayer
                membershipManager.target // _membershipManager
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await governanceManager.waitForDeployment();
       
        // Transfer ownership of MembershipManager to GovernanceManager
        await membershipManager.transferOwnership(governanceManager.target);
     
        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID
        groupKey = uuidToGroupKey(groupId);
        rootHash = ethers.keccak256(ethers.toUtf8Bytes("rootHash"));
        rootHash2 = ethers.keccak256(ethers.toUtf8Bytes("newRootHash"));  
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
            ethers.keccak256(ethers.toUtf8Bytes("nullifier")),
            ethers.keccak256(ethers.toUtf8Bytes("rootHash")),
            groupKey
        ];

        //valid proof inputs:
        validUuid = 'bf56d8b4-618e-4bfe-a2b8-0ebeb9c06d2f';
        validGroupKey = uuidToGroupKey(validUuid);
        validProof = [12723661512181512564133082958539708051764952847649598922160420109792300741443n, 15144361789550256843213075442927675468301954095924989815572321543713978227405n, 20270241392072168651438981133015416857602620598228701171817367774149618707468n, 4877456838660641332552184869109646996849294253004601609722208324042182098323n, 7261302575944315335843096330984291989534135790958415582300303855324013463434n, 17059939722681569876256023347311823572921555744783998865164128382959626172145n, 7449812983458737162776414980469547753644179222330696758981954226362759896882n, 10641421991359777901645242057672314113508631588884595909434388382237270021042n, 8876545890956321689446937191990903233582151554274653346292321937218277735584n, 3232224451609947834030577364646852979186824344325814820658751382295022002609n, 15964517761502927109299580134898520178176602897264081752509669515597702971814n, 21327182056006907161993883660696141865439046282159120725544845334922879278512n, 5361424725479157736413749383892726192053575425379500041241859501321251694476n, 17176015431443966048798739122305704455241223246261369322520892889973458270759n, 6472703655794652942567937422607903202651431634440030267562054789208020802048n, 17853559276152903276580215583902666950583551268253317580804436259152081841595n, 2478953388483023827812125619291476215465981049997786458697965607114959329747n, 13141686118219066901415421631920655181647708375873492850896836919877162647752n, 11411653162361138979989496693359129693880302138759332371037625874759743592395n, 7313684787946033708167892955359776119332991829670241610649748716029130490962n, 8730455425146887748876442529024890142752884755295966778983612828082865721439n, 7770269715349474167628620377544317787776637453366262357647343096731021446733n, 1840877294611034491185769928004348947501764941250083195301027481432841028883n, 15488884326484369161640536983044185418987833369312485600337930258641160429544n]
        validPublicSignals = [14625843210609328628808221693020936775910419632505608599170019946391716016853n, 21284411868483133640015840002243641200058418874841859199644495183871744595557n, 20347671511505755995800787811739622923322848038570576685329506851648789567890n]
        validPublicNullifier = ethers.toBeHex(validPublicSignals[0], 32);
        validRoot = ethers.toBeHex(validPublicSignals[1], 32);
        validExternalNullifier = ethers.toBeHex(validPublicSignals[2], 32);
    });

    it("setup: should deploy contracts correctly", async function () {
        expect(await membershipManager.target).to.be.properAddress;
        expect(await membershipVerifier.target).to.be.properAddress;
        expect(await nftImplementation.target).to.be.properAddress;
        expect(await governanceManager.target).to.be.properAddress;
    });

    it("setup: should set the GovernanceManager as the owner of MembershipManager", async function () {
        const owner = await membershipManager.owner();
        expect(owner).to.equal(governanceManager.target);
    });

    it("setup: should set the deployer as the initial owner of GovernanceManager", async function () {
        const owner = await governanceManager.owner();
        expect(owner).to.equal(deployerAddress);
    });

    it("setup: should allow the deployer to upgrade the GovernanceManager", async function () {
        console.log("TO DO");
    });

     it("setup: should not allow a non-owner to upgrade the GovernanceManager", async function () {
        console.log("TO DO");
    });

    it("setRelayer: should allow the owner (deployer) to set a new relayer and emit event", async function () {
        await expect(governanceManager.connect(deployer).setRelayer(user1Address))
            .to.emit(governanceManager, "RelayerSet")
            .withArgs(user1Address);
        const newRelayer = await governanceManager.connect(deployer).getRelayer();
        expect(newRelayer).to.equal(user1Address);
    });

    it("setRelayer: should not allow non-owner to set a new relayer", async function () {
        await expect(governanceManager.connect(user1).setRelayer(user1Address))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
    });

    it("setRelayer: should not allow setting the same relayer address", async function () {
        await expect(governanceManager.connect(deployer).setRelayer(relayerAddress))
            .to.be.revertedWithCustomError(governanceManager, "NewRelayerMustBeDifferent");
    });

    it("setRelayer: should not allow setting the zero address as relayer", async function () {
        await expect(governanceManager.connect(deployer).setRelayer(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(governanceManager, "RelayerAddressCannotBeZero");
    });

    it("delegateInitGroup: should allow the relayer to initialize a new group and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(relayer).delegateInitRoot(rootHash, groupKey)).to.emit(
            membershipManager, 
            "RootInitialized"
        );
    });

    it("delegateInitGroup: should not allow non-relayer to initialize a new group", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateInitRoot(rootHash, groupKey)).to.be.revertedWithCustomError(
            governanceManager, 
            "OnlyRelayerAllowed"
        );
    });

    it("delegateSetRoot: should allow the relayer to set a new root and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash, groupKey);
        await expect(governanceManager.connect(relayer).delegateSetRoot(rootHash2, groupKey))
            .to.emit(
                membershipManager, 
                "RootSet"
            ).withArgs(groupKey, rootHash, rootHash2);
    });

    it("delegateSetRoot: should not allow non-relayer to set a new root", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash, groupKey);
        await expect(governanceManager.connect(deployer).delegateSetRoot(rootHash2, groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateGetRoot: should allow the relayer to get the root of a group", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash, groupKey);
        const root = await governanceManager.connect(relayer).delegateGetRoot(groupKey);
        expect(root).to.equal(rootHash);
    });

    it("delegateGetRoot: should not allow non-relayer to get the root of a group", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash, groupKey);
        await expect(governanceManager.connect(deployer).delegateGetRoot(groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateVerifyProof: should allow the relayer to verify a proof and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(validGroupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(validRoot, validGroupKey);
        await expect(governanceManager.connect(relayer).delegateVerifyProof(validProof, validPublicSignals, validGroupKey))
            .to.emit(
                membershipManager, 
                "ProofVerified"
            )
            .withArgs(validGroupKey, validPublicSignals[0]);
    });

    it("delegateVerifyProof: should not allow non-relayer to verify a valid proof", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(validGroupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(validRoot, validGroupKey);
        await expect(governanceManager.connect(deployer).delegateVerifyProof(validProof, validPublicSignals, validGroupKey))
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it("delegateVerifyProof: should not allow the relayer to verify an invalid proof", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(rootHash, groupKey);
        await expect(governanceManager.connect(relayer).delegateVerifyProof(invalidProof, invalidPublicSignals, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager,
                "InvalidProof"
            );
    });

    it("delegateVerifyProof: should not allow the relayer to verify a valid proof with an invalid group key", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(ethers.keccak256(ethers.toUtf8Bytes("invalidGroupKey")), nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(validRoot, ethers.keccak256(ethers.toUtf8Bytes("invalidGroupKey")));
        await expect(governanceManager.connect(relayer).delegateVerifyProof(validProof, validPublicSignals, ethers.keccak256(ethers.toUtf8Bytes("invalidGroupKey"))))
            .to.be.revertedWithCustomError(
                membershipManager,
                "InvalidGroupKey"
            );
    });

    it("delegateMintNftToMember: should allow the relayer to mint an NFT to a member and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey))
            .to.emit(
                membershipManager, 
                "MemberNftMinted"
            )
            .withArgs(groupKey, user1Address, anyUint);
    });

    it("delegateMintNftToMember: should not allow a non-relayer to mint an NFT to a member", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateMintNftToMember(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });


    /*
    function delegateMintNftToMember(address memberAddress, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).mintNftToMember(memberAddress, groupKey);
    }
    */
});
