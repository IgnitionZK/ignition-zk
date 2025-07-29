const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { Conversions } = require("./utils.js");

describe("Vote Manager Unit Tests:", function () {
    
    // Managers
    let MembershipManager;
    let membershipManager;
    let ProposalManager;
    let proposalManager;
    let voteManager;
    let VoteManager;
    
    // Verifiers
    let MembershipVerifier;
    let membershipVerifier;
    let ProposalVerifier;
    let proposalVerifier;
    let ProposalClaimVerifier;
    let proposalClaimVerifier;
    let voteVerifier;
    let VoteVerifier;
    let MockProposalVerifier;
    let mockProposalVerifier;
    let MockProposalClaimVerifier;
    let mockProposalClaimVerifier;
    let MockVoteVerifier;
    let mockVoteVerifier;

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
    let proposalId;
    let groupKey;
    let epochKey;
    let proposalKey;
    let contextKey;
    let proposalContextKey;

    // roots
    let rootHash1;
    let rootHash2;

    // nullifiers
    let submissionNullifier1;
    let submissionNullifier2;
    let claimNullifier1;
    let claimNullifier2;
    let voteNullifier1;
    let voteNullifier2;
    let voteNullifier3;
    let voteNullifier4;

    // content hashes
    let contentHash1;
    let contentHash2;

    // vote choice
    let voteChoiceNo;
    let voteChoiceYes;
    let voteChoiceAbstain;

    // NFT metadata
    let nftName;
    let nftSymbol;
    let nftName2;
    let nftSymbol2;

    // mock proof inputs
    let mockProof;
    let mockPublicSignals1;
    let mockPublicSignals2;
    let mockPublicSignals3;
    let mockPublicSignals4;
    let mockProposalProof;
    let mockProposalPublicSignals1;

    // real proof inputs
    let realRoot;
    let realGroupId;
    let realEpochId;
    let realProposalId;
    let realGroupKey;
    let realEpochKey;
    let realProposalKey;
    let realContextKey;
    let proofContextHash;
    let proofVoteNullifier;
    let proofVoteChoice;
    let proofRoot;
    let realProof;
    let realPublicSignals;

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

        // Get Contract Factory for ProposalClaimVerifier
        ProposalClaimVerifier = await ethers.getContractFactory("ProposalClaimVerifier");

        // Get Contract Factory for MockProposalClaimVerifier
        MockProposalClaimVerifier = await ethers.getContractFactory("MockProposalClaimVerifier");

        // Get Contract Factory for ProposalManager
        ProposalManager = await ethers.getContractFactory("ProposalManager");

        // Get Contract Factory for VoteVerifier
        VoteVerifier = await ethers.getContractFactory("VoteVerifier");

        // Get Contract Factory for MockVoteVerifier
        MockVoteVerifier = await ethers.getContractFactory("MockVoteVerifier");

        // Get Contract Factory for VoteManager
        VoteManager = await ethers.getContractFactory("VoteManager");

        // Initialize variables
        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID for group
        epochId = '123e4567-e89b-12d3-a456-426614174001'; // Example UUID for epoch
        proposalId = '123e4567-e89b-12d3-a456-426614174002'; // Example UUID for proposal
        groupKey = Conversions.stringToBytes32(groupId);
        epochKey = Conversions.stringToBytes32(epochId);
        proposalKey = Conversions.stringToBytes32(proposalId);
        contextKey = await Conversions.computeVoteContextKey(groupId, epochId, proposalId);
        proposalContextKey = await Conversions.computeContextKey(groupId, epochId);
        rootHash1 = Conversions.stringToBytes32("rootHash1");
        rootHash2 = Conversions.stringToBytes32("rootHash2");
        submissionNullifier1 = Conversions.stringToBytes32("submissionNullifier1");
        submissionNullifier2 = Conversions.stringToBytes32("submissionNullifier2");
        claimNullifier1 = Conversions.stringToBytes32("claimNullifier1");
        voteNullifier1 = Conversions.stringToBytes32("voteNullifier1");
        voteNullifier2 = Conversions.stringToBytes32("voteNullifier2");
        voteNullifier3 = Conversions.stringToBytes32("voteNullifier3");
        voteNullifier4 = Conversions.stringToBytes32("voteNullifier4");
        contentHash1 = Conversions.stringToBytes32("contentHash1");
        contentHash2 = Conversions.stringToBytes32("contentHash2");
        voteChoiceNo = 19014214495641488759237505126948346942972912379615652741039992445865937985820n;
        voteChoiceYes = 18586133768512220936620570745912940619677854269274689475585506675881198879027n;
        voteChoiceAbstain = 8645981980787649023086883978738420856660271013038108762834452721572614684349n;
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
        
        // mock public signals with one vote choice and nullifier:
        mockPublicSignals1 = [
            contextKey,
            voteNullifier1,
            voteChoiceNo,
            rootHash1
        ];

        // mock public signals with another vote choice and nullifier on the same context:
        mockPublicSignals2 = [
            contextKey,
            voteNullifier2,
            voteChoiceYes,
            rootHash1
        ];

        // mock public signals with another vote choice and nullifier on the same context:
        mockPublicSignals3 = [
            contextKey,
            voteNullifier3,
            voteChoiceAbstain,
            rootHash1
        ];

        // mock public signals with another vote and nullifier on the same context:
        mockPublicSignals4 = [
            contextKey,
            voteNullifier4,
            voteChoiceYes,
            rootHash1
        ];

        // mock proof inputs:
        mockProposalProof = [
            1, 2, 3, 4, 5, 6,
            7, 8, 9, 10, 11, 12,
            13, 14, 15, 16, 17, 18,
            19, 20, 21, 22, 23, 24
        ];
        
        mockProposalPublicSignals1 = [
            proposalContextKey,
            submissionNullifier1,
            claimNullifier1,
            rootHash1, 
            contentHash1
        ];

        // Real submission proof inputs 
        realGroupId = '21fae0f7-096f-4c8f-8515-93b9f247582d';
        realEpochId = '06134393-4412-4e46-9534-85186ea7bbe8';
        realProposalId = '5b18c981-c040-4672-bf60-67e1301d3e27';
        realGroupKey = Conversions.stringToBytes32(realGroupId);
        realEpochKey = Conversions.stringToBytes32(realEpochId);
        realProposalKey = Conversions.stringToBytes32(realProposalId);
        realContextKey = await Conversions.computeVoteContextKey(realGroupId, realEpochId, realProposalId);
        realRoot = ethers.toBeHex(8382028473019880437532291517957501217880306914202305497790783762876650668442n);
        realProof =  [
            17241792997511107201897863306094777314926475833200857300061218874926862366018n,
            21456906774424548386179338800734902021784308783080064186916010520902932250476n,
            4908857536100165770040411941509812763909357135227985238325693796696150060418n,
            14207230787413971858174639492522113655089826685614262203060162038041937891807n,
            12156015110021397895129439713756250074405471696187178557134761594331963398344n,
            4290322829335762738701226068028653104065882480272403619417196817739491865822n,
            12185626974981590074519598024324942371175495320694690328722471902556261694074n,
            261239090236245056598335987487771922398725240024085357857400009591217079326n,
            20198735017118523441568953945005352984484279801328419083613987039052293633790n,
            12049252573429088734253371146335261455443282302556244724452300272285852155505n,
            10321770691339775675416830320363581480529406891268984043720827933065478800761n,
            17303373358440823498170960985049790212907334347976091383945332633787129157298n,
            10874101949555588051210384007919073360754203025092629159208052370749203968509n,
            2327914559595877270688643468000660553213149453866785762767674074984064487211n,
            13137822934691539331007849651722360309668460569432141141345998796878982933549n,
            20142971130351507531955388220252624866941292426929395628149158904430168494059n,
            8089838127897321859331387855255364061955168172652491054853054935072546207696n,
            11996421024502771999460161232561013302532269565150112935538949698249653798006n,
            18091410146946519755448783668396149664549794463504896044292053524483574409791n,
            20728351039097345458363345667664182141592405055684272087818222985000167273071n,
            11473726201516941872736105722433299278139403889476817154534535312289628604703n,
            8651126138119855218161543229775648086721528567642359776119206663780283918960n,
            967693627922034853860832390357866172289507422641829926554421164999880529871n,
            21434216221199439867880748260349801931802759017317134919258442469439711709952n
        ];

        realPublicSignals = [
            12417957784691345063069918387226828600187557829716594172267574950900505522223n,
            21007579385376765008226274111057452106701207043545364523489130415023884686357n,
            18586133768512220936620570745912940619677854269274689475585506675881198879027n,
            8382028473019880437532291517957501217880306914202305497790783762876650668442n
        ];
        proofContextHash = ethers.toBeHex(realPublicSignals[0], 32);
        proofVoteNullifier = ethers.toBeHex(realPublicSignals[1], 32);
        proofVoteChoice = ethers.toBeHex(realPublicSignals[2], 32);
        proofRoot = ethers.toBeHex(realPublicSignals[3], 32);

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


        // Deploy VoteVerifier contract
        voteVerifier = await VoteVerifier.deploy();
        await voteVerifier.waitForDeployment();

        // Deploy MockVoteVerifier contract
        mockVoteVerifier = await MockVoteVerifier.deploy();
        await mockVoteVerifier.waitForDeployment();

        // Deploy VoteManager UUPS Proxy (ERC‑1967) contract
        voteManager = await upgrades.deployProxy(
            VoteManager,
            [
                await governor.getAddress(),
                voteVerifier.target
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
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

    async function setVoteVerifierAndVerifyVote(signer, verifier, proof, publicSignals, contextKey, groupKey, root) {
        // Set the vote verifier
        await voteManager.connect(signer).setVoteVerifier(verifier);
        // Verify the vote
        return await voteManager.connect(signer).verifyVote(
            proof,
            publicSignals,
            contextKey,
            groupKey,
            root
        ); 
    }

    async function linearInterpolation(x) {
        // Linear interpolation function
        x1 = 30;
        x2 = 200;
        y1 = 50;
        y2= 25;
        slopePositive = (y1 - y2) / (x2 - x1);
        return Math.floor(y1 - slopePositive * (x - x1));
    }

    it(`SET UP: contract deployment
        TESTING: deployed addresses
        EXPECTED: should deploy VoteVerifier and VoteManager contracts`, async function () {
        expect(await voteVerifier.target).to.be.properAddress;
        expect(await voteManager.target).to.be.properAddress;
    });

    it(`ACCESS CONTROL: ownership
        TESTING: owner()
        EXPECTED: should set the governor as the owner of VoteManager`, async function () {
        expect(await voteManager.owner()).to.equal(await governor.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING: onlyOwner(), transferOwnership()
        EXPECTED: should allow the governor to transfer ownership of the vote manager`, async function () {
        await voteManager.connect(governor).transferOwnership(await user1.getAddress());
        expect(await voteManager.owner()).to.equal(await user1.getAddress());
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  onlyOwner(), transferOwnership()
        EXPECTED: should not allow non-governor to transfer ownership of the vote manager`, async function () {
        await expect(voteManager.connect(user1).transferOwnership(await governor.getAddress()))
            .to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`ACCESS CONTROL: ownership
        TESTING:  error: OwnableInvalidOwner, transferOwnership()
        EXPECTED: should not allow governor to transfer ownership to the zero address`, async function () {
        await expect(voteManager.connect(governor).transferOwnership(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(voteManager, "OwnableInvalidOwner");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to upgrade the vote manager contract`, async function () {

        const proxyAddress = await voteManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the vote manager contract to a new version
        const VoteManagerV2 = await ethers.getContractFactory("MockVoteManagerV2", { signer: governor });
        const voteManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            VoteManagerV2, 
            {
                kind: "uups"
            }
        );
        await voteManagerV2.waitForDeployment();

        const upgradedAddress = await voteManagerV2.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);

        // Check if the upgrade was successful
        expect(newImplementationAddress).to.be.properAddress;
        expect(upgradedAddress).to.equal(proxyAddress, "Proxy address should remain the same after upgrade");
        expect(newImplementationAddress).to.not.equal(implementationAddress, "Implementation address should change after upgrade");
    });

    it(`FUNCTIONALITY: upgradeability 
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to upgrade the vote manager contract`, async function () {

        const VoteManagerV2 = await ethers.getContractFactory("MockVoteManagerV2", { signer: user1 });
        await expect(upgrades.upgradeProxy(
            await voteManager.target,
            VoteManagerV2,
            {
                kind: "uups"
            }
        )).to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTIONALITY: upgradeability
        TESTING: proxy data storage
        EXPECTED: should preserve proxy data after upgrade`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await voteManager.connect(governor).setMemberCount(groupKey, 1);
   
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProposalProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);
       
        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
       
        // verify a vote on the first proposal
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals1,
            contextKey,
            groupKey,
            rootHash1
        );
        
        // check that the vote nullifier is stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);

        // get the current proxy address and implementation address
        const proxyAddress = await voteManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        // Upgrade the vote manager contract to a new version
        const VoteManagerV2 = await ethers.getContractFactory("MockVoteManagerV2", { signer: governor });
        const voteManagerV2 = await upgrades.upgradeProxy(
            proxyAddress, 
            VoteManagerV2, 
            {
                kind: "uups"
            }
        );
        await voteManagerV2.waitForDeployment();
        const upgradedAddress = await voteManagerV2.target;

        // Check if the vote nullifier is still stored correctly after the upgrade
        expect(await voteManagerV2.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);
    });

    it(`FUNCTION: getGroupParams
        TESTING: onlyOwner authorization (success), stored param data
        EXPECTED: should allow the governor to get group parameters`, async function () {
        
        // check the group parameters of an unitiialized group
        const params = await voteManager.connect(governor).getGroupParams(groupKey);
        expect(params.memberCount).to.equal(0);
        expect(params.quorum).to.equal(0);
        
        // check the group parameters of an initialized group
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        await voteManager.connect(governor).setMemberCount(groupKey, 1);

        const updatedParams = await voteManager.connect(governor).getGroupParams(groupKey);
        expect(updatedParams.memberCount).to.equal(1);
        expect(updatedParams.quorum).to.equal(50);
    });

    it(`FUNCTION: getGroupParams
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-governor to get group parameters`, async function () {
        await expect(voteManager.connect(user1).getGroupParams(groupKey)).to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setMemberCount, _setQuorum, getGroupParams
        TESTING: stored data: quorum via linear interpolation (group size 31 -> 199)
        EXPECTED: should calculate and set the correct quorum value for a given group size`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
       
            
        let xValues = [];
        let expectedQuorumValues = [];
        let quorumValues = [];
        let expectedMemberCountValues = [];
        for (i = 31; i < 200; i++ ) {
            xValues.push(i);

            // calculate the expected quorum value via linear interpolation
            const interpolatedValue = await linearInterpolation(i);
            expectedQuorumValues.push(interpolatedValue);

            // set the member count and get the group parameters
            await voteManager.connect(governor).setMemberCount(groupKey, i);
            const params = await voteManager.connect(governor).getGroupParams(groupKey);
            quorumValues.push(params.quorum);
            expectedMemberCountValues.push(params.memberCount);
        }

        expect(quorumValues).to.deep.equal(expectedQuorumValues, `Quorum values do not match expected values for group sizes 31 to 199`);
        expect(xValues).to.deep.equal(expectedMemberCountValues, `Member count values do not match expected values for group sizes 31 to 199`);
        
        // Calculate the min and max quorum values
        const quorumValuesNumbers = quorumValues.map(q => Number(q));
        minCalculatedQuorum = Math.min(...quorumValuesNumbers);
        maxCalculatedQuorum = Math.max(...quorumValuesNumbers);
        
        // Check that the min and max quorum values are within the expected range
        expect(minCalculatedQuorum).to.be.greaterThanOrEqual(25, `Min quorum value should be >= 25 for group sizes 31 to 199`);
        expect(maxCalculatedQuorum).to.be.lessThanOrEqual(50, `Max quorum value should be <= 50 for group sizes 31 to 199`);
    });

    it(`FUNCTION: setMemberCount, _setQuorum, getGroupParams
        TESTING: stored data: quorum for group size <= 30 or group size >= 200
        EXPECTED: should set the max quorum value for a small group and the min quorum value for a large group`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
       
        // check the quorum values for group sizes 1 to 30 and 200 to 1024
        for (i = 1; i < 31; i++ ) {
            await voteManager.connect(governor).setMemberCount(groupKey, i);
            const params = await voteManager.connect(governor).getGroupParams(groupKey);
            expect(params.quorum).to.equal(50);
            expect(params.memberCount).to.equal(i);
        }

        for (i = 200; i < 1025; i++ ) {
            await voteManager.connect(governor).setMemberCount(groupKey, i);
            const params = await voteManager.connect(governor).getGroupParams(groupKey);
            expect(params.quorum).to.equal(25);
            expect(params.memberCount).to.equal(i);
        }
        
    });

    it(`FUNCTION: setMemberCount, _setQuorum
        TESTING: event: MemberCountSet, QuorumSet
        EXPECTED: should emit MemberCountSet and QuorumSet events when setting a new group member count`, async function () {

        // check the group parameters of an initialized group
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        const newMemberCount = 31; 
        const expectedQuorum = await linearInterpolation(newMemberCount);

        expect(await voteManager.connect(governor).setMemberCount(groupKey, newMemberCount))
            .to.emit(voteManager, "MemberCountSet").withArgs(groupKey, newMemberCount)
            .to.emit(voteManager, "QuorumSet").withArgs(groupKey, expectedQuorum);
    });

    it(`FUNCTION: setMemberCount, _setQuorum, getGroupParams
        TESTING: custom error: InvalidMemberCount
        EXPECTED: should not allow the governor to set the group size to 0 or > 1024`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        await expect(voteManager.connect(governor).setMemberCount(groupKey, 0)).to.be.revertedWithCustomError(
            voteManager,
            "InvalidMemberCount"
        );

        await expect(voteManager.connect(governor).setMemberCount(groupKey, 1025)).to.be.revertedWithCustomError(
            voteManager,
            "InvalidMemberCount"
        );
    });

    it(`FUNCTION: setQuorumParams
        TESTING: onlyOwner authorization (success), stored data, event: QuorumParamsSet
        EXPECTED: should allow the governor to set the quorum parameters`, async function () {
        
        // check the group parameters of an initialized group
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the quorum parameters
        const newQuorumParams = {
            minQuorumPercent: 30,
            maxQuorumPercent: 40,
            maxGroupSizeForMinQuorum: 100,
            minGroupSizeForMaxQuorum: 20
        };

        expect(await voteManager.connect(governor).setQuorumParams(
            newQuorumParams.minQuorumPercent,
            newQuorumParams.maxQuorumPercent,
            newQuorumParams.maxGroupSizeForMinQuorum,
            newQuorumParams.minGroupSizeForMaxQuorum
        )).to.emit(voteManager, "QuorumParamsSet").withArgs(
            newQuorumParams.minQuorumPercent,
            newQuorumParams.maxQuorumPercent,
            newQuorumParams.maxGroupSizeForMinQuorum,
            newQuorumParams.minGroupSizeForMaxQuorum
        );

        // get the quorum parameters and check if they were set correctly
        const quorumParams = await voteManager.connect(governor).getQuorumParams();
        expect(quorumParams.minQuorumPercent).to.equal(newQuorumParams.minQuorumPercent);
        expect(quorumParams.maxQuorumPercent).to.equal(newQuorumParams.maxQuorumPercent);
        expect(quorumParams.maxGroupSizeForMinQuorum).to.equal(newQuorumParams.maxGroupSizeForMinQuorum);
        expect(quorumParams.minGroupSizeForMaxQuorum).to.equal(newQuorumParams.minGroupSizeForMaxQuorum);
    });

    it(`FUNCTION: setQuorumParams
        TESTING: custom error: InvalidQuorumParams, InvalidGroupSizeParams
        EXPECTED: should not allow the governor to set invalid quorum parameters`, async function () {
        
        const invalidMinQuorumPercent = 20;
        const invalidMaxQuorumPercent = 60;
        const invalidMaxGroupSizeForMinQuorum = 1025;
        const invalidMinGroupSizeForMaxQuorum = 3;
        
        const quorumParams = {
            minQuorumPercent: 25,
            maxQuorumPercent: 50,
            maxGroupSizeForMinQuorum: 200,
            minGroupSizeForMaxQuorum: 30
        };

        await expect(voteManager.connect(governor).setQuorumParams(
            invalidMinQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidQuorumParams"
        );

        await expect(voteManager.connect(governor).setQuorumParams(
            quorumParams.minQuorumPercent,
            invalidMaxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidQuorumParams"
        );

        await expect(voteManager.connect(governor).setQuorumParams(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            invalidMaxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidGroupSizeParams"
        );

        await expect(voteManager.connect(governor).setQuorumParams(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            invalidMinGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "InvalidGroupSizeParams"
        );
    });

    it(`FUNCTION: setQuorumParams
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow a non-governor to set quorum parameters`, async function () {
        const quorumParams = {
            minQuorumPercent: 25,
            maxQuorumPercent: 50,
            maxGroupSizeForMinQuorum: 200,
            minGroupSizeForMaxQuorum: 30
        };
        await expect(voteManager.connect(user1).setQuorumParams(
            quorumParams.minQuorumPercent,
            quorumParams.maxQuorumPercent,
            quorumParams.maxGroupSizeForMinQuorum,
            quorumParams.minGroupSizeForMaxQuorum
        )).to.be.revertedWithCustomError(
            voteManager,
            "OwnableUnauthorizedAccount"
        );
    });

    it(`FUNCTION: setVoteVerifier
        TESTING: custom error: AddressCannotBeZero
        EXPECTED: should not allow the governor to set the vote verifier to the zero address`, async function () {
        await expect(voteManager.connect(governor).setVoteVerifier(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(voteManager, "AddressCannotBeZero");
    });
    
    it(`FUNCTION: setVoteVerifier
        TESTING: onlyOwner authorization (success)
        EXPECTED: should allow the governor to set the vote verifier`, async function () {
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
        expect(await voteManager.connect(governor).getVoteVerifier()).to.equal(mockVoteVerifier.target);
    });
    
    it(`FUNCTION: setVoteVerifier
        TESTING: onlyOwner authorization (failure)
        EXPECTED: should not allow non-governor to set the vote verifier`, async function () {
        await expect(voteManager.connect(user1).setVoteVerifier(mockVoteVerifier.target))
            .to.be.revertedWithCustomError(voteManager, "OwnableUnauthorizedAccount");
    });

    it(`FUNCTION: setVoteVerifier
        TESTING: custom error: AddressIsNotAContract
        EXPECTED: should not allow the governor to set the vote verifier to an address that is not a contract`, async function () {
        await expect(voteManager.connect(governor).setVoteVerifier(user1.address))
            .to.be.revertedWithCustomError(voteManager, "AddressIsNotAContract");
    });

    it(`FUNCTION: setVoteVerifier
        TESTING: custom error: AddressDoesNotSupportInterface
        EXPECTED: should not allow the governor to set the vote verifier to an address not implementing the IVoteVerifier interface`, async function () {
        await expect(voteManager.connect(governor).setVoteVerifier(membershipManager.target))
            .to.be.revertedWithCustomError(voteManager, "AddressDoesNotSupportInterface");
    });

    it(`FUNCTION: verifyVote
        TESTING: onlyOwner authorization (success), stored data: vote nullifier, event: VoteVerified
        EXPECTED: should allow the governor to verify two different votes on the same proposal and emit event`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 2 (ie., only two members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 2);
        
        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProposalProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);
       
        // set the vote verifier to the mock verifier
        await voteManager.connect(governor).setVoteVerifier(mockVoteVerifier.target);
       
        // verify a vote on the first proposal
        expect(await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals1,
            contextKey,
            groupKey,
            rootHash1
        )).to.emit(voteManager, "VoteVerified").withArgs(
            contextKey,
            voteNullifier1,
            voteChoiceNo,
            groupKey,
            rootHash1
        );

        // check that the vote nullifier is stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);

        // verify a second vote on the same context with a different choice
        expect(await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals2,
            contextKey,
            groupKey,
            rootHash1
        )).to.emit(voteManager, "VoteVerified").withArgs(
            contextKey,
            voteNullifier2,
            voteChoiceYes,
            groupKey,
            rootHash1
        );

        // check that the second vote nullifier is stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier2)).to.equal(true);

        // check that the first vote nullifier is still stored correctly
        expect(await voteManager.connect(governor).getVoteNullifierStatus(voteNullifier1)).to.equal(true);
    });

    it(`FUNCTION: verifyVote
        TESTING: custom error: TallyingInconsistent
        EXPECTED: should not allow the governor to verify a vote if the vote count exceeds the group member count`, async function () {
        
         // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);
        
        // set the member count to 1 (ie., only one member can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 1);
        
        // set the proposal submission verifier to the mock verifier and verify a proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProposalProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);
       
        // set vote verifier to the mock verifier and verify the first vote on the proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockPublicSignals1, contextKey, groupKey, rootHash1);
        
        // verify a second vote on the same context with a different choice
        await expect(voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals2,
            contextKey,
            groupKey,
            rootHash1
        )).to.be.revertedWithCustomError(voteManager, "TallyingInconsistent");
    });

    it(`FUNCTION: verifyVote
        TESTING: stored data: vote tally, passed status
        EXPECTED: should store the correct tally and passed status after verifying 4 votes`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 4 (ie., only four members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 4);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProposalProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);

        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockPublicSignals1, contextKey, groupKey, rootHash1);

        const proposalResult = await voteManager.connect(governor).getProposalResult(contextKey);
        expect(proposalResult.tally).to.deep.equal([1, 0, 0]);
        expect(proposalResult.passed).to.equal(false);

        // verify a second vote on the same context with a different choice
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals2,
            contextKey,
            groupKey,
            rootHash1
        );

        const proposalResult2 = await voteManager.connect(governor).getProposalResult(contextKey);
        expect(proposalResult2.tally).to.deep.equal([1, 1, 0]);
        expect(proposalResult2.passed).to.equal(false);

        // verify a third vote on the same context with a different choice
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals3,
            contextKey, 
            groupKey,
            rootHash1
        );

        const proposalResult3 = await voteManager.connect(governor).getProposalResult(contextKey);
        expect(proposalResult3.tally).to.deep.equal([1, 1, 1]);
        expect(proposalResult3.passed).to.equal(false);

        // verify a fourth vote on the same context with a yes choice
        await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals4,
            contextKey, 
            groupKey,
            rootHash1
        );

        const proposalResult4 = await voteManager.connect(governor).getProposalResult(contextKey);
        expect(proposalResult4.tally).to.deep.equal([1, 2, 1]);
        expect(proposalResult4.passed).to.equal(true);

    });

    it(`FUNCTION: verifyVote
        TESTING: stored data: vote tally, passed status
        EXPECTED: should not mark a proposal as passed if it has yes majority but has not reached quorum`, async function () {
        
        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 4 (ie., only 4 members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 4);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProposalProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);

        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockPublicSignals2, contextKey, groupKey, rootHash1);

        const proposalResult = await voteManager.connect(governor).getProposalResult(contextKey);
        expect(proposalResult.tally).to.deep.equal([0, 1, 0 ]);
        expect(proposalResult.passed).to.equal(false);
    });

    it(`FUNCTION: verifyVote
        TESTING: event: VoteTallyUpdated
        EXPECTED: should emit VoteTallyUpdated event with the correct parameters after verifying a vote`, async function () {

        // deploy group NFT and initialize group root
        await deployGroupNftAndInitRoot(governor, groupKey, nftName, nftSymbol, rootHash1);

        // set the member count to 4 (ie., only four members can vote)
        await voteManager.connect(governor).setMemberCount(groupKey, 4);

        // set the proposal submission verifier to the mock verifier and verify the first proposal
        await setSubmissionVerifierAndVerifyProposal(governor, mockProposalVerifier.target, mockProposalProof, mockProposalPublicSignals1, proposalContextKey, rootHash1);

        // set the vote verifier to the mock verifier and verify a vote on the first proposal
        await setVoteVerifierAndVerifyVote(governor, mockVoteVerifier.target, mockProof, mockPublicSignals1, contextKey, groupKey, rootHash1);

        // verify a second vote and check the emitted event
        const tx = await voteManager.connect(governor).verifyVote(
            mockProof,
            mockPublicSignals2,
            contextKey,
            groupKey,
            rootHash1
        );
        const receipt = await tx.wait();

        // get emitted events from the logs
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = voteManager.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const VoteTallyUpdatedEvent = parsedEvents.filter((event) => event && event.name === "VoteTallyUpdated");

        // should have emitted 1 VoteTallyUpdated event
        const numEvents = VoteTallyUpdatedEvent.length;
        expect(numEvents).to.equal(1, "Should have emitted 1 VoteTallyUpdated event");

        const event = VoteTallyUpdatedEvent[0];
        const eventVoteTally = event.args[1].map(t => Number(t));
        const expectedVoteTally = [1, 1, 0];

        expect(eventVoteTally).to.deep.equal(expectedVoteTally, "Vote tally in event should match expected tally after second vote");
        expect(event.args[0]).to.equal(contextKey, "Context key in event should match expected context key");

    });

});
