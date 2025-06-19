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
        groupKey = ethers.keccak256(ethers.toUtf8Bytes(groupId));
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
            ethers.keccak256(ethers.toUtf8Bytes("rootHash"))
        ];

        //valid proof inputs:
        validGroupKey =  ethers.keccak256(ethers.toUtf8Bytes("bf56d8b4-618e-4bfe-a2b8-0ebeb9c06d2f"));
        validProof = [20674327637025367664506244357097979168874011659997965212578840228821579083917n, 18154562055949517591009366677147562198736228463028186015368306069411072277399n, 7123596389929049825700189106621770751324891314754936025036587078961564030289n, 9281029334595411766441580381150926959899653652899850646606894291676838891531n, 1447343571025195077543763729484389366627857056153168189544385074435713348107n, 16253308708768748035389080963267786726633177064911817899761481629125349879576n, 12701221827554035367649901166654368730216804495826452307606409039151265999058n, 9553189797919831865213080280057701465606022569425331110549551300946678002421n, 14394218438259968846290506442992167719794631448278776139132896842032459409067n, 17513880645893501135423194462609283488441135379358433717179954758763851869066n, 6777220326612688938495862645415152889581039257329440535370662451289936295279n, 15228564177227916761628330529627362823743069237269459156226479555237648634906n, 11197320498812021529773144257147012589910490770489462666608614607531035232197n, 19703124114507239786573491784163203699503925288041337095070162536301210355259n, 16132479802799583295349530962508551815824072217343315199759373561666581047750n, 5038883688664860352301876460359711297178859361798126011933687759190366167514n, 10484567550861316135619427475672543588094455002133303014946572231673601876921n, 686060677057090146153975231859482127887534647144234586938262712799689957333n, 7922762181338968434410137138468593979559044141024155959859430594752856930367n, 14236382074830612923104187448419417138772320387336712972787281392698217960631n, 15104054627204394003699965595848530547370907105330354061309146536527696505280n, 6534735420410825772982162367315490627623022683850765317556994567185322176694n, 20484809097961565313803679741352766846028526536934273228526895403998124497936n, 16391146020758777388827024924092728385929212801864226190846545137553669805134n]
        validPublicSignals = [14625843210609328628808221693020936775910419632505608599170019946391716016853n, 21284411868483133640015840002243641200058418874841859199644495183871744595557n]
        validRoot = ethers.toBeHex(validPublicSignals[1], 32);

        // Deploy AttackerERC721 contract
        attackerERC721 = await AttackerERC721.deploy(membershipManager.target, groupKey);
        await attackerERC721.waitForDeployment();
    });

    // TEST CASES
    it("should deploy NFTImplementation, MembershipManager, MembershipVerifier and AttackerERC721 contracts", async function () {
        expect(membershipManager.target).to.be.properAddress;
        expect(membershipVerifier.target).to.be.properAddress;
        expect(nftImplementation.target).to.be.properAddress;
        expect(attackerERC721.target).to.be.properAddress;
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
            "MemberAddressCannotBeZero"
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

    it("mintNftToMember: should not mint an NFT to a member if the governor revokes the MINTER_ROLE", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        
        // Revoke MINTER_ROLE from the governor
        const minterRole = await clone.MINTER_ROLE();
        await clone.connect(governor).revokeRole(
            minterRole,
            membershipManager.target
        );
        
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
        
        // Revoke MINTER_ROLE from the governor
        const minterRole = await clone.MINTER_ROLE();
        await clone.connect(governor).revokeRole(
            minterRole,
            membershipManager.target
        );

        // Re-grant MINTER_ROLE to the governor
        await clone.connect(governor).grantRole(
            minterRole,
            membershipManager.target
        );

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
            "MemberAddressCannotBeZero"
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

    it("burnMemberNft: should not allow the NFT to be burned if the governor revokes the BURNER_ROLE", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        // Revoke BURNER_ROLE from the governor
        const burnerRole = await clone.BURNER_ROLE();
        await clone.connect(governor).revokeRole(
            burnerRole,
            membershipManager.target
        );
        // Attempt to burn NFT after revoking BURNER_ROLE
        await expect(
            membershipManager.connect(governor).burnMemberNft(user1Address, groupKey)
        ).to.be.revertedWithCustomError(
            clone,
            "AccessControlUnauthorizedAccount"
        );
    });

    it("burnMemberNft: should allow the governor to burn a member's NFT after re-granting the BURNER_ROLE", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).mintNftToMember(user1Address, groupKey);

        const cloneAddress = await membershipManager.connect(governor).getGroupNftAddress(groupKey);
        const clone = nftImplementation.attach(cloneAddress);
        // Revoke BURNER_ROLE from the governor
        const burnerRole = await clone.BURNER_ROLE();
        await clone.connect(governor).revokeRole(
            burnerRole,
            membershipManager.target
        ); 
        // Re-grant BURNER_ROLE to the governor
        await clone.connect(governor).grantRole(
            burnerRole,
            membershipManager.target
        );  
        // Burn NFT after re-granting BURNER_ROLE
        await expect(membershipManager.connect(governor).burnMemberNft(user1Address, groupKey))
            .to.emit(membershipManager, "MemberNftBurned")
            .withArgs(groupKey, user1Address, anyUint); 
    });

    it("verifyProof: should not allow the governor to verify an invalid proof", async function () {
        const user1Address = await user1.getAddress();
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(rootHash, groupKey);
        await expect(membershipManager.connect(governor).verifyProof(invalidProof, invalidPublicSignals, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager,
                "InvalidProof"
            );
    });

    it("verifyProof: should emit ProofFailed event for an invalid proof", async function () {
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
            .withArgs(validGroupKey, validPublicSignals[0]);
    });

    it("verifyProof: should store the nullifier after a successful proof verification", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await membershipManager.connect(governor).verifyProof(validProof, validPublicSignals, validGroupKey);
        const nullifier = ethers.toBeHex(validPublicSignals[0], 32);
        const isNullifierUsed = await membershipManager.connect(governor).getNullifier(validGroupKey, nullifier);
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

});

