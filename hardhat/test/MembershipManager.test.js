const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("MembershipManager", function () {
    let MembershipManager;
    let membershipManager;
    let MembershipVerifier;
    let membershipVerifier;
    let NFTImplementation;
    let nftImplementation;
    
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

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {
        [deployer, governor, relayer, user1] = await ethers.getSigners();

        // Get Contract Factory for MembershipManager
        MembershipManager = await ethers.getContractFactory("MembershipManager");  
        // Get Contract Factory for MembershipManagerVerifier
        MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");
        // Get Contract Factory for NFT implementation
        NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");
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
        groupKey = ethers.keccak256(ethers.toUtf8Bytes(groupId));
        rootHash = ethers.keccak256(ethers.toUtf8Bytes("rootHash"));
        rootHash2 = ethers.keccak256(ethers.toUtf8Bytes("newRootHash"));  
        nftName = "Test Group NFT";
        nftSymbol = "TGNFT";  
        nftName2 = "Test Group NFT 2";
        nftSymbol2 = "TGNFT2";  
    });

    // TEST CASES
    it("should deploy NFTImplementation, MembershipManager and MembershipVerifier contracts", async function () {
        expect(membershipManager.target).to.be.properAddress;
        expect(membershipVerifier.target).to.be.properAddress;
        expect(nftImplementation.target).to.be.properAddress;
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
        console.log("User1 Address:", user1Address);
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await expect(membershipManager.connect(governor).mintNftToMember(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftMinted")
            .withArgs(groupKey, user1Address, anyUint); // Assuming the first minted token ID is 0
    })

    /*function mintNftToMember(
        address memberAddress, 
        bytes32 groupKey
        ) public onlyOwner() {
        
        address groupNftAddress = groupNftAddresses[groupKey];
        IERC721IgnitionZK nft = IERC721IgnitionZK(groupNftAddress);
        uint256 memberBalance = nft.balanceOf(memberAddress);
        uint256 mintedTokenId;

        if (memberAddress == address(0)) revert MemberAddressCannotBeZero();
        if (groupNftAddress == address(0)) revert GroupNftNotSet();
        if (memberBalance > 0) revert MemberAlreadyHasToken();
        if (memberAddress.code.length != 0) revert MemberMustBeEOA();
    
        try nft.safeMint(memberAddress) returns (uint256 _tokenId) {
            mintedTokenId = _tokenId;
            emit MemberNftMinted(groupKey, memberAddress, mintedTokenId);
        } catch {
            revert MintingFailed();
        }
    }

    */


});

