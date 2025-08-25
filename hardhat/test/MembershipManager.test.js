const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils.js");
const { setUpFixtures, deployFixtures } = require("./fixtures");

describe("Membership Manager Unit Tests:", function () {

    let fixtures;

    // RUN ONCE BEFORE ALL TESTS
    before(async function () {

        fixtures = await setUpFixtures();
        ({
            // Signers
            governor, user1, deployer, relayer,

            // Test constants
            groupKey, groupKey2, epochKey, proposalKey, 
            rootHash1, rootHash2,
            nftName, nftSymbol, nftName2, nftSymbol2,
            mockProof, 
            mockMembershipPublicSignals1, mockMembershipPublicSignals2,
            realGroupId, realEpochId, 
            realGroupKey, realEpochKey, realRoot, 
            realMembershipProof, realMembershipPublicSignals, 
            membershipProofRoot, membershipProofGroupHash
        } = fixtures);

    });

    // RUN BEFORE EACH TEST
    beforeEach(async function () {
        const deployedFixtures = await deployFixtures();

        ({
            membershipManager, membershipVerifier, nftImplementation, mockMembershipVerifier
        } = deployedFixtures);
        
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
        const cloneAddress = await membershipManager.groupNftAddresses(groupKey);
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
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // check that the root for the groupKey is stored correctly
        expect(await membershipManager.groupRoots(groupKey)).to.equal(rootHash1);

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
        expect(await mockMembershipManagerV2.groupRoots(groupKey)).to.equal(rootHash1, "Root should remain the same after upgrade");

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
        expect(await membershipManager.membershipVerifier()).to.equal(membershipVerifier.target);
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
        await deployGroupNftAndSetRoot(governor, invalidKey, nftName, nftSymbol, rootHash1);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);
        
        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockMembershipPublicSignals1,
            invalidKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidGroupKey");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify a membership with a root different than the current root`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockMembershipPublicSignals2,
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
            mockMembershipPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "RootNotYetInitialized");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: onlyOwner authorization
        EXPECTED: should not allow non-governor to verify membership`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        await expect(membershipManager.connect(user1).verifyMembership(
            mockProof,
            mockMembershipPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: verifyMembership (with mock submission verifier)
        TESTING: custom error: InvalidProof
        EXPECTED: should not let governor verify membership with an invalid proof`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the membership verifier to the mock verifier
        await membershipManager.connect(governor).setMembershipVerifier(mockMembershipVerifier.target);

        // set the mock membership verifier to return an invalid proof
        await mockMembershipVerifier.connect(governor).setIsValid(false);

        await expect(membershipManager.connect(governor).verifyMembership(
            mockProof,
            mockMembershipPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidProof").withArgs(groupKey);
    });

    it(`FUNCTION: verifyMembership (with real verifier, mock proof)
        TESTING: zero proof inputs handling
        EXPECTED: should not allow the governor to verify membership with a zero proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        const zeroProof = new Array(24).fill(0);

        await expect(membershipManager.connect(governor).verifyMembership(
            zeroProof,
            mockMembershipPublicSignals1,
            groupKey
        )).to.be.revertedWithCustomError(membershipManager, "InvalidProof").withArgs(groupKey);
    });

    it(`FUNCTION: verifyMembership (with real verifier, valid proof)
        TESTING: event: ProofVerified, stored data: group root
        EXPECTED: should allow the governor to verify membership with a valid proof`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        await expect(membershipManager.connect(governor).verifyMembership(
            realMembershipProof,
            realMembershipPublicSignals,
            realGroupKey
        )).to.emit(membershipManager, "ProofVerified").withArgs(realGroupKey);

        const storedRoot = await membershipManager.groupRoots(realGroupKey);
        expect(storedRoot).to.equal(realRoot, "Root hash should match the initialized value");

    });

    it(`FUNCTION: verifyMembership (with real verifier, valid proof, invalid public signals)
        TESTING: custom error: InvalidMerkleRoot
        EXPECTED: should not allow the governor to verify membership with a valid proof and an invalid root in the public signals`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, realGroupKey, nftName, nftSymbol, realRoot);

        // increment the first public signal (root) to make it invalid
        const invalidPublicSignals = [...realMembershipPublicSignals];
        invalidPublicSignals[0] = invalidPublicSignals[0] + BigInt(1);

        await expect(membershipManager.connect(governor).verifyMembership(
            realMembershipProof,
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
        const invalidPublicSignals = [...realMembershipPublicSignals];
        invalidPublicSignals[1] = invalidPublicSignals[1] + BigInt(1);

        await expect(membershipManager.connect(governor).verifyMembership(
            realMembershipProof,
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
        await expect(membershipManager.connect(governor).setRoot(rootHash1, groupKey))
            .to.emit(membershipManager, "RootInitialized")
            .withArgs(groupKey, rootHash1);
        const storedRoot = await membershipManager.groupRoots(groupKey);
        expect(storedRoot).to.equal(rootHash1, "Root hash should match the initialized value");

        // set a new root for the group
        await expect(membershipManager.connect(governor).setRoot(rootHash2, groupKey))
            .to.emit(membershipManager, "RootSet")
            .withArgs(groupKey, storedRoot, rootHash2);
            
        const updatedRoot = await membershipManager.groupRoots(groupKey);
        expect(updatedRoot).to.equal(rootHash2, "Root hash should match the new value");
    });

    it(`FUNCTION: setRoot
        TESTING: authorization: onlyOwner (failure)
        EXPECTED: should not allow a non-governor to set the root of a group`, async function () {

        // Deploy group NFT first
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Initialize root for the group
        await expect(membershipManager.connect(user1).setRoot(rootHash1, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager,
                "OwnableUnauthorizedAccount"
            );

    });
        

    it(`FUNCTION: setRoot
        TESTING: custom error: GroupNftNotSet
        EXPECTED: should not allow the governor to set the root of a group without an existing deployed group NFT`, async function () {
       
        // Attempt to initialize root for a group without a deployed NFT
        await expect(membershipManager.connect(governor).setRoot(rootHash1, groupKey))
            .to.revertedWithCustomError(
                membershipManager,
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
            membershipManager,
            "RootCannotBeZero"
        );
    });    

    it(`FUNCTION: setRoot
        TESTING: stored data: root hash
        EXPECTED: should store two different root hashes after calling setRoot for two different groups`, async function () {
        
        // Deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await deployGroupNftAndSetRoot(governor, groupKey2, nftName2, nftSymbol2, rootHash2);

        const storedRoot1 = await membershipManager.groupRoots(groupKey);
        const storedRoot2 = await membershipManager.groupRoots(groupKey2);

        expect(storedRoot1).to.equal(rootHash1, "Root hash for groupKey should match the initialized value");
        expect(storedRoot2).to.equal(rootHash2, "Root hash for groupKey2 should match the initialized value");
        expect(storedRoot1).to.not.equal(storedRoot2, "Root hashes for different groups should be different");
    });

    
    it(`FUNCTION: setRoot
        TESTING: custom error: NewRootMustBeDifferent
        EXPECTED: should not allow the governor to set a root that is the same as the current root`, async function () {
        // deploy group NFT and initialize group root
        await deployGroupNftAndSetRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // Attempt to set the same root again
        await expect(
            membershipManager.connect(governor).setRoot(rootHash1, groupKey)
        ).to.be.revertedWithCustomError(
            membershipManager,
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
        const storedNftAddress = await membershipManager.groupNftAddresses(groupKey);
        expect(storedNftAddress).to.not.equal(ethers.ZeroAddress, "NFT address should not be zero");
        expect(storedNftAddress).to.be.properAddress;
    });

    it(`FUNCTION: deployGroupNft
        TESTING: stored data: group NFT address
        EXPECTED: should allow the governor to deploy two new group NFTs and get their addresses`, async function () {

        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).deployGroupNft(groupKey2, nftName2, nftSymbol2);

        // Check if the NFT address is stored correctly
        const storedAddress1 = await membershipManager.groupNftAddresses(groupKey);
        const storedAddress2 = await membershipManager.groupNftAddresses(groupKey2);

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
            membershipManager,
            "InvalidNftSymbolLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftSymbolLength
        EXPECTED: should not allow the governor to deploy a group NFT with a symbol length longer than 5 characters`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, nftName, "TGNFT123")
        ).to.be.revertedWithCustomError(
            membershipManager,
            "InvalidNftSymbolLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftNameLength
        EXPECTED: should not allow the governor to deploy a group NFT with an empty name length`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, "", nftSymbol)
        ).to.be.revertedWithCustomError(
            membershipManager,
            "InvalidNftNameLength"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: InvalidNftNameLength
        EXPECTED: should not allow the governor to deploy a group NFT with a name longer than 32 characters`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(groupKey, "0123456789012345678901234567890123", nftSymbol)
        ).to.be.revertedWithCustomError(
            membershipManager,
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
            membershipManager,
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
            membershipManager,
            "GroupNftAlreadySet"
        );
    });

    it(`FUNCTION: deployGroupNft
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to deploy a group NFT`, async function () {
        await expect(
            membershipManager.connect(user1).deployGroupNft(groupKey, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(membershipManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: deployGroupNft
        TESTING: custom error: KeyCannotBeZero
        EXPECTED: should not allow the governor to deploy a group NFT with a zero groupKey`, async function () {
        await expect(
            membershipManager.connect(governor).deployGroupNft(ethers.ZeroHash, nftName, nftSymbol)
        ).to.be.revertedWithCustomError(
            membershipManager,
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
            membershipManager,
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
            membershipManager,
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
            membershipManager,
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
            membershipManager,
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
            membershipManager,
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
        const cloneAddress = await membershipManager.groupNftAddresses(groupKey);
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
        const cloneAddress = await membershipManager.groupNftAddresses(groupKey);
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
        const checkAddress = await membershipManager.connect(governor).groupNftAddresses(groupKey);
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
            membershipManager,
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
            membershipManager,
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
            membershipManager,
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
            membershipManager,
            "MemberDoesNotHaveToken"
        );
    });

    it(`FUNCTION: burnMemberNft
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to burn an NFT at address zero`, async function () {
        await membershipManager.connect(governor).deployGroupNft(groupKey, nftName, nftSymbol);

        // Cannot mint NFT to address zero so cannot burn it
        await expect(membershipManager.connect(governor).mintNftToMember(ethers.ZeroAddress, groupKey)).to.be.revertedWithCustomError(
            membershipManager,
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
            membershipManager,
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
        const cloneAddress = await membershipManager.groupNftAddresses(groupKey);
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
        const cloneAddress = await membershipManager.groupNftAddresses(groupKey);
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

    it(`FUNCTION: getContractVersion
        TESTING: stored version
        EXPECTED: should allow the governor to view the current contract version`, async function () {
        expect(await membershipManager.getContractVersion()).to.equal(
            "MembershipManager v1.0.0",
            "Should return the correct contract version"
        );
    });

});

