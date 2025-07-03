const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils.js");

describe("MembershipManager", function () {
    let MembershipManager;
    let membershipManager;
    let MembershipVerifier;
    let membershipVerifier;
    let NFTImplementation;
    let nftImplementation;
    let AttackerERC721;
    let attackerERC721;
    
    let deployer;
    let governor;
    let relayer; 
    let user1;

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

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, governor, relayer, user1] = await ethers.getSigners();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  
        // Get Contract Factory for MembershipManagerVerifier
        MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");
        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");
        // Get Contract Factory for AttackerERC721
        AttackerERC721 = await ethers.getContractFactory("AttackerERC721");
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

        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID
        groupKey = Conversions.stringToBytes32(groupId);
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
            Conversions.stringToBytes32("nullifier"),
            Conversions.stringToBytes32("rootHash"),
            groupKey
        ];

        //valid proof inputs:
        validUuid = 'bf56d8b4-618e-4bfe-a2b8-0ebeb9c06d2f';
        validGroupKey = Conversions.stringToBytes32(validUuid);
        validProof = [12723661512181512564133082958539708051764952847649598922160420109792300741443n, 15144361789550256843213075442927675468301954095924989815572321543713978227405n, 20270241392072168651438981133015416857602620598228701171817367774149618707468n, 4877456838660641332552184869109646996849294253004601609722208324042182098323n, 7261302575944315335843096330984291989534135790958415582300303855324013463434n, 17059939722681569876256023347311823572921555744783998865164128382959626172145n, 7449812983458737162776414980469547753644179222330696758981954226362759896882n, 10641421991359777901645242057672314113508631588884595909434388382237270021042n, 8876545890956321689446937191990903233582151554274653346292321937218277735584n, 3232224451609947834030577364646852979186824344325814820658751382295022002609n, 15964517761502927109299580134898520178176602897264081752509669515597702971814n, 21327182056006907161993883660696141865439046282159120725544845334922879278512n, 5361424725479157736413749383892726192053575425379500041241859501321251694476n, 17176015431443966048798739122305704455241223246261369322520892889973458270759n, 6472703655794652942567937422607903202651431634440030267562054789208020802048n, 17853559276152903276580215583902666950583551268253317580804436259152081841595n, 2478953388483023827812125619291476215465981049997786458697965607114959329747n, 13141686118219066901415421631920655181647708375873492850896836919877162647752n, 11411653162361138979989496693359129693880302138759332371037625874759743592395n, 7313684787946033708167892955359776119332991829670241610649748716029130490962n, 8730455425146887748876442529024890142752884755295966778983612828082865721439n, 7770269715349474167628620377544317787776637453366262357647343096731021446733n, 1840877294611034491185769928004348947501764941250083195301027481432841028883n, 15488884326484369161640536983044185418987833369312485600337930258641160429544n]
        validPublicSignals = [14625843210609328628808221693020936775910419632505608599170019946391716016853n, 21284411868483133640015840002243641200058418874841859199644495183871744595557n, 20347671511505755995800787811739622923322848038570576685329506851648789567890n]
        validPublicNullifier = ethers.toBeHex(validPublicSignals[0], 32);
        validRoot = ethers.toBeHex(validPublicSignals[1], 32);
        validExternalNullifier = ethers.toBeHex(validPublicSignals[2], 32);

        // Deploy AttackerERC721 contract
        attackerERC721 = await AttackerERC721.deploy(membershipManager.target, groupKey);
        await attackerERC721.waitForDeployment();
    });

    // TEST CASES
    it("deployment: should deploy NFTImplementation, MembershipManager, MembershipVerifier and AttackerERC721 contracts", async function () {
        expect(membershipManager.target).to.be.properAddress;
        expect(membershipVerifier.target).to.be.properAddress;
        expect(nftImplementation.target).to.be.properAddress;
        expect(attackerERC721.target).to.be.properAddress;
    });

    it("ownership: should allow the owner to transfer ownership of membershipManager", async function () {
        const membershipManagerOwner = await membershipManager.owner();
        expect(membershipManagerOwner).to.equal(await governor.getAddress(), "MembershipManager owner should be the governor");
        // Transfer ownership to a new address
        const newOwner = await user1.getAddress();
        await expect(membershipManager.connect(governor).transferOwnership(newOwner))
            .to.emit(membershipManager, "OwnershipTransferred")
            .withArgs(await governor.getAddress(), newOwner);
        const updatedOwner = await membershipManager.owner();
        expect(updatedOwner).to.equal(newOwner, "MembershipManager owner should be updated to user1");
    });

    it("ownership: should not allow non-owner to transfer ownership of membershipManager", async function () {
        const newOwner = await user1.getAddress();
        await expect(
            membershipManager.connect(user1).transferOwnership(newOwner)
        ).to.be.revertedWithCustomError(
            membershipManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it("upgrades: should allow the governor to upgrade the MembershipManager contract", async function () {
        const proxyAddress = await membershipManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        const MembershipManagerV2 = await ethers.getContractFactory("MembershipManagerV2", { signer: governor });
        const membershipManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            MembershipManagerV2, 
            {
                kind: "uups"
            }
        );
        await membershipManagerV2.waitForDeployment();
        const upgradedAddress = await membershipManagerV2.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it("upgrades: should not allow non-governor to upgrade the MembershipManager contract", async function () {
        const proxyAddress = await membershipManager.target;
        const MembershipManagerV2 = await ethers.getContractFactory("MembershipManagerV2", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            proxyAddress,
            MembershipManagerV2,
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(membershipManager, "OwnableUnauthorizedAccount");
    });

    it("initRoot: should allow the governor to initialize the root of a group and emit event", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(membershipManager.connect(governor).initRoot(rootHash, groupKey))
            .to.emit(membershipManager, "RootInitialized")
            .withArgs(groupKey, rootHash);
        const storedRoot = await membershipManager.connect(governor).getRoot(groupKey);
        expect(storedRoot).to.equal(rootHash, "Root hash should match the initialized value");
    });

    it("initRoot: should not allow the governor to initialize the root of a group without an existing deployed group NFT", async function () {
       
        await expect(membershipManager.connect(governor).initRoot(rootHash, groupKey))
            .to.revertedWithCustomError(
                MembershipManager,
                "GroupNftNotSet"
            );
    });

    it("initRoot: should not allow the governor to initialize the root of the same group again", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        // Attempt to re-initialize the group with a different root hash
        await expect(
            membershipManager.connect(governor).initRoot(rootHash2, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootAlreadyInitialized"
        );
    });

    it("initRoot: should not allow non-governor to initialize the root of a group", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(user1).initRoot(rootHash, groupKey)
        ).to.be.reverted;
    });

    it("initRoot: should not allow the governor to initialize the group with a zero root hash", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).initRoot(ethers.ZeroHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootCannotBeZero"
        );
    });    

    it("setRoot: should allow the governor to set a new root for an existing group and emit event", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        await expect(membershipManager.connect(governor).setRoot(rootHash2, groupKey))
            .to.emit(membershipManager, "RootSet")
            .withArgs(groupKey, rootHash, rootHash2);
        
        const storedRoot = await membershipManager.connect(governor).getRoot(groupKey);
        expect(storedRoot).to.equal(rootHash2, "Root hash should match the new value");
    });

    it("setRoot: should not allow the governor to set a new root for a group that has not been initialized", async function () {
        // Attempt to set root for a group that has not been initialized
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).setRoot(rootHash2, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootNotYetInitialized"
        );
    });

    it("setRoot: should not allow the governor to set a zero root hash for an existing group", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        await expect(
            membershipManager.connect(governor).setRoot(ethers.ZeroHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "RootCannotBeZero"
        );
    });

    it("setRoot: should not allow the governor to set a root that is the same as the current root", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        await expect(
            membershipManager.connect(governor).setRoot(rootHash, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "NewRootMustBeDifferent"
        );
    }); 

    it("setRoot: should not allow non-governor to set a new root for an existing group", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        await expect(
            membershipManager.connect(user1).setRoot(rootHash2, groupKey)
        ).to.be.reverted;
    });

    it("deployGroupNft: should allow the governor to deploy a new group NFT and emit event", async function () {
        
        await expect(membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol))
            .to.emit(membershipManager, "GroupNftDeployed")
            .withArgs(groupKey, ethers.isAddress, nftName, nftSymbol);

        const storedNftAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        expect(storedNftAddress).to.not.equal(ethers.ZeroAddress, "NFT address should not be zero");
    });

    it("deployGroupNft: should not allow the governor to deploy a group NFT for an already initialized group", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "GroupNftAlreadySet"
        );
    });

    it("deployGroupNft: should not allow the governor to deploy a group NFT for an already initialized groupKey but with a different NFT name and symbol", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName2, nftSymbol2)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "GroupNftAlreadySet"
        );
    });

    it("deployGroupNft: should not allow non-governor to deploy a group NFT", async function () {
        await expect(
            membershipManager.connect(user1).deployGroupNft(groupKey, nftName, nftSymbol)
        ).to.be.reverted;
    });

    it("deployGroupNft: should not allow the governor to deploy a group NFT with a zero groupKey", async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(ethers.ZeroHash, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "KeyCannotBeZero"
        );
    });

    /*
    it("getGroupNftAddress: should return the correct NFT address for a given group key", async function () {
        const tx = await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const receipt = await tx.wait();
        console.log("Receipt:", receipt);
        const nftAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        expect(nftAddress).to.not.equal(ethers.ZeroAddress, "NFT address should not be zero");
    });
    */

    it("mintNftToMember: should allow the governor to mint an NFT to a member and emit event", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(membershipManager.connect(governor).mintNftToMember(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftMinted")
            .withArgs(groupKey, user1Address, anyUint); // anyUint allows for any uint256 value for the tokenId
    })

    it("mintNftToMember: should not allow the governor to mint an NFT to a member with a zero address", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(
            membershipManager.connect(governor).mintNftToMember(ethers.ZeroAddress, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "AddressCannotBeZero"
        );
    });

    it("mintNftToMember: should not allow the governor to mint an NFT to a member for a group that has not been initialized", async function () {
        const user1Address = await user1.getAddress();
        // Attempt to mint NFT for a group that has not been initialized
        await expect(
            membershipManager.connect(governor).mintNftToMember(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "GroupNftNotSet"
        );
    });

    it("mintNftToMember: should not allow the governor to mint an NFT to a member if the member already has a token", async function () {
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

    it("mintNftToMember: should not allow the governor to mint an NFT to a member if the member address is a contract", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol); 
        // Attempt to mint NFT to a contract address
        await expect(
            membershipManager.connect(governor).mintNftToMember(membershipVerifier.target, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "MemberMustBeEOA"
        );
    });

    it("mintNftToMember: should not allow non-governor to mint an NFT to a member", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        // Attempt to mint NFT by a non-governor
        await expect(
            membershipManager.connect(user1).mintNftToMember(user1Address, groupKey)
        ).to.be.reverted;
    });

    it("mintNftToMember: should not mint an NFT to a member if the membershipManager revokes the MINTER_ROLE via the governor", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
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

    it("mintNftToMember: should allow the governor to mint an NFT to a member after re-granting the MINTER_ROLE", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        
        // Revoke MINTER_ROLE from the membershipManager
        await membershipManager.connect(governor).revokeMinterRole(cloneAddress);

        // Re-grant MINTER_ROLE to the governor
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

    it("burnMemberNft: should allow the governor to burn a member's NFT and emit event", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        await expect(membershipManager.connect(governor).burnMemberNft(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftBurned")
            .withArgs(groupKey, user1Address, anyUint);
    });

    it("burnMemberNft: should not allow the governor to burn a member's NFT if the member does not have a token", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        // Attempt to burn NFT for a member that does not have a token
        await expect(
            membershipManager.connect(governor).burnMemberNft(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            MembershipManager,
            "MemberDoesNotHaveToken"
        );
    });

    it("burnMemberNft: should not allow the governor to burn an NFT at address zero", async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(membershipManager.connect(governor).mintNftToMember(ethers.ZeroAddress, groupKey)).to.be.revertedWithCustomError(
            MembershipManager,
            "AddressCannotBeZero"
        );
    });

    it("burnMemberNft: should not allow non-governor to burn a member's NFT", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        // Attempt to burn NFT by a non-governor
        await expect(
            membershipManager.connect(user1).burnMemberNft(user1Address, groupKey)
        ).to.be.reverted;
    });

    it("burnMemberNft: should not allow the membershipManager to burn a member's NFT if the governor revokes the BURNER_ROLE", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

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

    it("burnMemberNft: should allow the membershipManager to burn a member's NFT after re-granting the BURNER_ROLE", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        // Revoke BURNER_ROLE from the membershipManager
        await membershipManager.connect(governor).revokeBurnerRole(cloneAddress);

        // Re-grant BURNER_ROLE to the membershipManager
        await membershipManager.connect(governor).grantBurnerRole(cloneAddress, membershipManager.target);

        // Burn NFT after re-granting BURNER_ROLE
        await expect(membershipManager.connect(governor).burnMemberNft(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftBurned")
            .withArgs(groupKey, user1Address, anyUint); 
    });

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

    it("NFT transfer: should not allow the owner of the NFT to transfer it", async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        const receipt = await tx.wait();

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
      
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Attempt to transfer the NFT by the owner
        await expect(
            clone.connect(user1).transferFrom(user1Address, deployerAddress, tokenId)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it("NFT transfer: should not allow the owner of the NFT to approve another address to transfer it", async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        const receipt = await tx.wait();

        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Attempt to approve another address to transfer the NFT by the owner
        await expect(
            clone.connect(user1).approve(deployerAddress, 0)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it("NFT transfer: should not allow the owner of the NFT to set approval for all", async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        await tx.wait();

        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Attempt to set approval for all by the owner
        await expect(
            clone.connect(user1).setApprovalForAll(deployerAddress, true)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it("NFT transfer: should not allow the owner of the NFT to transfer it to a contract address", async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        await tx.wait();

        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Attempt to transfer the NFT to a contract address by the owner
        await expect(
            clone.connect(user1).transferFrom(user1Address, membershipVerifier.target, 0)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it("NFT transfer: should not allow the owner of the NFT to approve a contract address to transfer it", async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        await tx.wait();
      
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Attempt to approve a contract address to transfer the NFT by the owner
        await expect(
            clone.connect(user1).approve(membershipVerifier.target, 0)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

    it("NFT transfer: should not allow the owner of the NFT to set approval for all for a contract address", async function () {
        const user1Address = await user1.getAddress();
        const deployerAddress = await deployer.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const tx = await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);
        const receipt = await tx.wait();
      
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);

        // Attempt to set approval for all for a contract address by the owner
        await expect(
            clone.connect(user1).setApprovalForAll(membershipVerifier.target, true)
        ).to.be.revertedWithCustomError(
            clone,
            "TransferNotAllowed"
        );
    });

});

