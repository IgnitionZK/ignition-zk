const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("MembershipManager", function () {
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
    function uuidToKey(uuid) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(uuid));
        // Convert the hash to a BigInt and reduce it modulo the prime field
        const reduced = BigInt(hash) % FIELD_MODULUS;
        return ethers.toBeHex(reduced, 32); // Return as a 32-byte hex string
    }

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
                await governor.getAddress(),
                membershipManager.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await proposalManager.waitForDeployment();
        console.log("ProposalManager deployed at:", proposalManager.target);

        // set the proposalManager in the membershipManager
        const setProposalManagerTx = await membershipManager.connect(governor).setProposalManager(proposalManager.target);
        await setProposalManagerTx.wait();

        const proposalManagerAddress = await membershipManager.connect(governor).getProposalManager();
        console.log("ProposalManager set in MembershipManager:", proposalManagerAddress);
        console.log("ProposalManager address:", proposalManager.target);

        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID for group
        epochId = '123e4567-e89b-12d3-a456-426614174001'; // Example UUID for epoch
        groupKey = uuidToKey(groupId);
        epochKey = uuidToKey(epochId);
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
            groupKey, 
            epochKey
        ];

        //valid proof inputs:
        validUuid = 'bf56d8b4-618e-4bfe-a2b8-0ebeb9c06d2f';
        validEpochId = 'b35a76b6-2bd6-4574-84ef-95e15fe9494c';
        validGroupKey = uuidToKey(validUuid);
        validEpochKey = uuidToKey(validEpochId);
        validProof =  [12958021018979418393944114964926897544179575934768617424294567819347082452728n, 19287735109379161819268673381558436099084462584594636909892992258906815283721n, 791905615392429957563925063359664173950618205077871928917591943584379551823n, 18135485190521416327544873840081689396844428966890500751999255867657668344886n, 17150725440003978530267377106880179024297506127349580872851267397284915379674n, 2488227028324622241601640971331202954699816963155795326205760586618926802786n, 20083520347332913689360595378062953241831587793849121859427858020140027283494n, 10665605121210006793527070664175932778033499125043282500031844101749916249083n, 2283581527115529042589963015905251156508539864468679895866284722797673248847n, 1127439493179986693132798295842354538473044861514517139877540562275916920866n, 20402508512007246467680246290489064379859633584669228682310216498307378948865n, 3806489150536275492348970923859348408185217875613171893908017561649392235683n, 15684819300842507148766279280045217216816943860379165196446177159761438246980n, 5509130097023228149780267059740896678812948321682618649044661925908705499306n, 673535061167533266540918715714131711904877670152736056205101557797552924946n, 16637763245136636456777361885299678748148725670275075843442473959072286016806n, 20782982978992836416334710532181620629959790537952312959347739035817319158464n, 4555890443951558059850025759388550408132960678783863426493604352442933534895n, 9486938337958734621883298185261907941712880508493506680069747324874904147365n, 2766919349228423347431361544675937490422024204201825249441409510713540949617n, 11858944838550452913270691111685624562487820893195319795012584315339849204352n, 3182480634884297100508421758793573225993379355929464574365384864431516019639n, 13794173128187210514566781621907528109225426378013870778264395182490715284519n, 12021341385319412919564537672279442438029828087112299552029387708053038340194n]
        validPublicSignals = [6219059910625286432814117206860852964718324073129525663326729141810174748686n, 21284411868483133640015840002243641200058418874841859199644495183871744595557n, 1283130483707697204596890536765700120177143313650385409814137454094124301572n, 20347671511505755995800787811739622923322848038570576685329506851648789567890n, 7162851525276523189041557138790825564608864400686918105650551824137033479532n]
        validProposalNullifier = ethers.toBeHex(validPublicSignals[0], 32);
        validRoot = ethers.toBeHex(validPublicSignals[1], 32);
        validContentHash = ethers.toBeHex(validPublicSignals[2], 32);
        validGroupHash = ethers.toBeHex(validPublicSignals[3], 32);
        validEpochHash = ethers.toBeHex(validPublicSignals[4], 32);
    });

    it("should deploy Membership Verifier, MembershipManager, ProposalVerifier, ProposalManager contracts", async function () {
        expect(await membershipManager.target).to.be.properAddress;
        expect(await proposalManager.target).to.be.properAddress;
        expect(await membershipVerifier.target).to.be.properAddress;
        expect(await proposalVerifier.target).to.be.properAddress;
        expect(await nftImplementation.target).to.be.properAddress;
    });

    it("should allow the governor to verify a valid proof", async function () {
        await membershipManager.connect(governor).deployGroupNft(validGroupKey, nftName, nftSymbol);
        await membershipManager.connect(governor).initRoot(validRoot, validGroupKey);
        await expect(proposalManager.connect(governor).verifyProposal(
            validProof,
            validPublicSignals,
            validGroupKey,
            validEpochKey)).to.emit(proposalManager, "ProofVerified")
            .withArgs(validGroupKey, validEpochKey, validProposalNullifier);
    });

});

