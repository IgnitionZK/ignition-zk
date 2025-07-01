const { ethers, upgrades, keccak256 , toUtf8Bytes, HashZero} = require("hardhat");
const { expect } = require("chai");
const { anyUint, anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { Conversions } = require("./utils");

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

    let validPropGroupId;
    let validPropEpochId;
    let validPropGroupKey;
    let validPropEpochKey;
    let validPropContextKey;
    let validPropRoot;
    let validPropProof;
    let validPropPublicSignals;
    let ProofPropContextHash;
    let ProofProposalNullifier;
    let ProofPropRoot;
    let ProofContentHash;

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
        // Get Contract Factory for ProposalVerifier
        ProposalVerifier = await ethers.getContractFactory("ProposalVerifier");
        // Get Contract Factory for ProposalManager
        ProposalManager = await ethers.getContractFactory("ProposalManager");
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
        
        // Deploy the ProposalVerifier contract
        proposalVerifier = await ProposalVerifier.deploy();
        await proposalVerifier.waitForDeployment();
        
        // Deploy the ProposalManager UUPS Proxy (ERC‑1967) contract
        proposalManager = await upgrades.deployProxy(
            ProposalManager, 
            [
                proposalVerifier.target, // _proposalVerifier
                deployerAddress, // _initialOwner
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await proposalManager.waitForDeployment();
        
        // Deploy the Governance UUPS Proxy (ERC‑1967) contract
        governanceManager = await upgrades.deployProxy(
            GovernanceManager, 
            [
                deployerAddress,  // _initialOwner
                relayerAddress, // _relayer
                membershipManager.target, // _membershipManager
                proposalManager.target, // _proposalManager
            ],
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        await governanceManager.waitForDeployment();
       
        // Transfer ownership of MembershipManager to GovernanceManager
        await membershipManager.transferOwnership(governanceManager.target);

        // Tranfer ownership of ProposalManager to GovernanceManager
        await proposalManager.transferOwnership(governanceManager.target);
     
        groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID
        groupKey = Conversions.stringToBytes32(groupId);
        rootHash = Conversions.stringToBytes32("rootHash");
        rootHash2 = Conversions.stringToBytes32("newRootHash");
        nftName = "Test Group NFT";
        nftSymbol = "TGNFT";  
        nftName2 = "Test Group NFT 2";
        nftSymbol2 = "TGNFT2";  

        // invalid Membership proof inputs:
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

        //valid Membership proof inputs:
        validUuid = 'bf56d8b4-618e-4bfe-a2b8-0ebeb9c06d2f';
        validGroupKey = Conversions.stringToBytes32(validUuid);
        validProof = [12723661512181512564133082958539708051764952847649598922160420109792300741443n, 15144361789550256843213075442927675468301954095924989815572321543713978227405n, 20270241392072168651438981133015416857602620598228701171817367774149618707468n, 4877456838660641332552184869109646996849294253004601609722208324042182098323n, 7261302575944315335843096330984291989534135790958415582300303855324013463434n, 17059939722681569876256023347311823572921555744783998865164128382959626172145n, 7449812983458737162776414980469547753644179222330696758981954226362759896882n, 10641421991359777901645242057672314113508631588884595909434388382237270021042n, 8876545890956321689446937191990903233582151554274653346292321937218277735584n, 3232224451609947834030577364646852979186824344325814820658751382295022002609n, 15964517761502927109299580134898520178176602897264081752509669515597702971814n, 21327182056006907161993883660696141865439046282159120725544845334922879278512n, 5361424725479157736413749383892726192053575425379500041241859501321251694476n, 17176015431443966048798739122305704455241223246261369322520892889973458270759n, 6472703655794652942567937422607903202651431634440030267562054789208020802048n, 17853559276152903276580215583902666950583551268253317580804436259152081841595n, 2478953388483023827812125619291476215465981049997786458697965607114959329747n, 13141686118219066901415421631920655181647708375873492850896836919877162647752n, 11411653162361138979989496693359129693880302138759332371037625874759743592395n, 7313684787946033708167892955359776119332991829670241610649748716029130490962n, 8730455425146887748876442529024890142752884755295966778983612828082865721439n, 7770269715349474167628620377544317787776637453366262357647343096731021446733n, 1840877294611034491185769928004348947501764941250083195301027481432841028883n, 15488884326484369161640536983044185418987833369312485600337930258641160429544n]
        validPublicSignals = [14625843210609328628808221693020936775910419632505608599170019946391716016853n, 21284411868483133640015840002243641200058418874841859199644495183871744595557n, 20347671511505755995800787811739622923322848038570576685329506851648789567890n]
        validPublicNullifier = ethers.toBeHex(validPublicSignals[0], 32);
        validRoot = ethers.toBeHex(validPublicSignals[1], 32);
        validExternalNullifier = ethers.toBeHex(validPublicSignals[2], 32);

        // valid proposal proof inputs:
        validPropGroupId = '97dca094-bdd7-419b-a91a-5ea1f2aa0537';
        validPropEpochId = '2935f80b-9cbd-4000-8342-476b97148ee7';
        validPropGroupKey = Conversions.stringToBytes32(validPropGroupId);
        validPropEpochKey = Conversions.stringToBytes32(validPropEpochId);
        validPropContextKey = await Conversions.computeContextKey(validPropGroupId, validPropEpochId);
        validPropRoot = ethers.toBeHex(12886375653922554679898676191015074420004311699425387307536167956555820652530n);
        validPropProof =  [21324237216059067856001326008772402094911947511781008238699193212067506059989n, 2864945365585520580736445144193166667326617123191518303094327819055881893898n, 9465494702140843923161382740269992595504500424060825556224998583474537660180n, 16030498518445137856991221074247654384343749586559714739092600138780412645932n, 13206405049855604729091182801886236353027936746167389593413006162046950936130n, 4048180889747018366596516152682952495036411690853460926059538542586053452269n, 12609570602713816352353876541250421869933566683310145723520331357194292610763n, 7230708155655109188106883860486515119339867121429646046968379650376224850635n, 10422160017288146940026661823861144153069562258697813729447351579113292282332n, 19224572988623427900696980611184826575794205115052705819015127040433839387340n, 5464458218254524957773989784775535143151978126599232326359107991462941009341n, 17466015331361201857470101198136594356860417506221180269276007831559430608536n, 104111675735261926963102685527169626976556205102093081135657122263364031072n, 9647909420810049351150150731868472034940891632806970684008044685699041691902n, 5517304425124738952479655672080171447245708475489731074753736114408015336376n, 3992323730999170742568732932045647379760079477966357347131073234751644727731n, 21584736187497331654923350559507029513407311458396545387156833371106030587174n, 13124016152208354295720478942441341704945400125661605774849977175789656556849n, 94371825887095281395457359605641036224334013945154747165660946136508967536n, 20181668522149303921765270504092927578505186714381356313094322561091892021144n, 2428657391978333859718446390862958247155977941182284203839625529708575207306n, 11530011789437837834442028418577495349735102949773935147946044166578468073553n, 2820924891891396715015254206148811560495416088414132819592239590142857455122n, 11400422769785768671708829126366377902307285817944352534175654791039801233298n]
        validPropPublicSignals = [1783858561640217141101142531165136293815429284532457890755617800207039425768n, 7386565541285461939014061068084680752417332123732607638853227510160241742544n, 12886375653922554679898676191015074420004311699425387307536167956555820652530n, 1086211582699940520437986923287385710360225269413071107044506549724688350225n]
        ProofPropContextHash = ethers.toBeHex(validPropPublicSignals[0], 32);
        ProofProposalNullifier = ethers.toBeHex(validPropPublicSignals[1], 32);
        ProofPropRoot = ethers.toBeHex(validPropPublicSignals[2], 32);
        ProofPropContentHash = ethers.toBeHex(validPropPublicSignals[3], 32);
 
    });

    it("deployment: should deploy contracts correctly", async function () {
        expect(await membershipManager.target).to.be.properAddress;
        expect(await membershipVerifier.target).to.be.properAddress;
        expect(await nftImplementation.target).to.be.properAddress;
        expect(await governanceManager.target).to.be.properAddress;
    });

    it("ownership: should set the GovernanceManager as the owner of MembershipManager", async function () {
        const owner = await membershipManager.owner();
        expect(owner).to.equal(governanceManager.target);
    });

    it("ownership: should set the deployer as the initial owner of GovernanceManager", async function () {
        const owner = await governanceManager.owner();
        expect(owner).to.equal(deployerAddress);
    });

    it("ownership: should allow the owner to transfer ownership of GovernanceManager", async function () {
        await expect(governanceManager.connect(deployer).transferOwnership(user1Address))
            .to.emit(governanceManager, "OwnershipTransferred")
            .withArgs(deployerAddress, user1Address);
        const newOwner = await governanceManager.owner();
        expect(newOwner).to.equal(user1Address);
    });

    it("ownership: should not allow a non-owner to transfer ownership of GovernanceManager", async function () {
        await expect(governanceManager.connect(user1).transferOwnership(user1Address))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
    });

    it("upgrades: should allow the owner (deployer) to upgrade GovernanceManager", async function () {
        // governance Manager proxy address:
        const governanceManagerAddress = await governanceManager.target;
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(governanceManagerAddress);

        // Get contract factory for the new version of GovernanceManager
        const GovernanceManagerV2 = await ethers.getContractFactory("GovernanceManagerV2", {
            signer: deployer
        });
        // Upgrade the GovernanceManager contract
        const upgradedGovernanceManager = await upgrades.upgradeProxy(
            governanceManagerAddress, 
            GovernanceManagerV2,
            {
                kind: "uups"
            }
        );
        await upgradedGovernanceManager.waitForDeployment();
        const upgradedAddress = await upgradedGovernanceManager.target;
        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(upgradedAddress);

        // check that the upgrade was successful
        expect(upgradedAddress).to.be.properAddress;
        // check that the proxy address is still the same
        expect(governanceManagerAddress).to.equal(upgradedAddress);
        // check that the implementation address has changed
        expect(implementationAddress).to.not.equal(newImplementationAddress);
    });

    it("upgrades: should not allow a non-owner to upgrade GovernanceManager", async function () {
        const currentOwner = await governanceManager.owner();
        // Get contract factory for the new version of GovernanceManager
        const GovernanceManagerV2 = await ethers.getContractFactory("GovernanceManagerV2", {
            signer: user1
        }); 
        // Attempt to upgrade the GovernanceManager contract
        await expect(upgrades.upgradeProxy(
            governanceManager.target, 
            GovernanceManagerV2,
            {
                kind: "uups"
            }
        ))
            .to.be.revertedWithCustomError(governanceManager, "OwnableUnauthorizedAccount");
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

    it("delegateDeployGroupNft: should allow the relayer to deploy a new group NFT and emit event", async function () {
        await expect(governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol))
            .to.emit(
                membershipManager, 
                "GroupNftDeployed"
            )
            .withArgs(groupKey, anyValue, nftName, nftSymbol);
    });

    it("delegateDeployGroupNft: should store the correct NFT address after a group NFT is deployed", async function () {
        const tx = await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const receipt = await tx.wait();
    
        const parsedEvents = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = membershipManager.interface.parseLog(log);
                parsedEvents.push(parsedLog);
            } catch (error) {
                console.log("Could not parse log:", log, "Error:", error.message);
            }
        }
        const groupNftDeployedEvent = parsedEvents.find((event) => event && event.name === "GroupNftDeployed");
        expect(groupNftDeployedEvent).to.exist;
        const nftAddress = groupNftDeployedEvent.args[1];
        expect(nftAddress).to.be.properAddress;
        expect(await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey)).to.equal(nftAddress);
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

    it("delegateMintNftToMember: should not allow the relayer to mint an NFT to a member if the group does not exist", async function () {
        await expect(governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager, 
                "GroupNftNotSet"
            );
    });

    it("delegateBurnMemberNft: should allow the relayer to burn a member's NFT and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey);
        await expect(governanceManager.connect(relayer).delegateBurnMemberNft(user1Address, groupKey))
            .to.emit(
                membershipManager, 
                "MemberNftBurned"
            )
            .withArgs(groupKey, user1Address, anyUint);
    });

    it("delegateBurnMemberNft: should not allow a non-relayer to burn a member's NFT", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateMintNftToMember(user1Address, groupKey);
        await expect(governanceManager.connect(deployer).delegateBurnMemberNft(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateBurnMemberNft: should not allow the relayer to burn a member's NFT if the group does not exist", async function () {
        await expect(governanceManager.connect(relayer).delegateBurnMemberNft(user1Address, groupKey))
            .to.be.revertedWithCustomError(
                membershipManager, 
                "GroupNftNotSet"
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

    it("delegateRevokeMinterRole: should allow the relayer to revoke the minter role from the membership manager and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        const role = await nftImplementation.attach(nftAddress).MINTER_ROLE();
        await expect(governanceManager.connect(relayer).delegateRevokeMinterRole(nftAddress))
            .to.emit(
                membershipManager,
                "RoleRevoked"
            )
            .withArgs(nftAddress, role, membershipManager.target);
    });

    it("delegateRevokeMinterRole: should not allow a non-relayer to revoke the minter role", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateRevokeMinterRole(nftAddress))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateGrantMinterRole: should allow the relayer to grant the minter role to a user and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        const role = await nftImplementation.attach(nftAddress).MINTER_ROLE();
        await expect(governanceManager.connect(relayer).delegateGrantMinterRole(nftAddress, user1Address))
            .to.emit(
                membershipManager,
                "RoleGranted"
            )
            .withArgs(nftAddress, role, user1Address);
    });

    it("delegateGrantMinterRole: should not allow a non-relayer to grant the minter role", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateGrantMinterRole(nftAddress, user1Address))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateRevokeBurnerRole: should allow the relayer to revoke the burner role from the membership manager and emit event", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        const role = await nftImplementation.attach(nftAddress).BURNER_ROLE();
        await expect(governanceManager.connect(relayer).delegateRevokeBurnerRole(nftAddress))
            .to.emit(
                membershipManager,
                "RoleRevoked"
            )
            .withArgs(nftAddress, role, membershipManager.target);
    });

    it("delegateRevokeBurnerRole: should not allow a non-relayer to revoke the burner role", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        await expect(governanceManager.connect(deployer).delegateRevokeBurnerRole(nftAddress))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            ); 
    });

    it("delegateGetVerifier: should allow the relayer to view the address of the membership verifier", async function () {
        const verifierAddress = await governanceManager.connect(relayer).delegateGetVerifier();
        expect(verifierAddress).to.equal(membershipVerifier.target);
    });

    it("delegateGetVerifier: should not allow a  non-relayer to view the address of the membership verifier", async function () {
        await expect(governanceManager.connect(deployer).delegateGetVerifier())
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

    it("delegateGetGovernor: should allow the relayer to get the address of the governor", async function () {
        const governorAddress = await governanceManager.connect(relayer).delegateGetGovernor();
        expect(governorAddress).to.equal(governanceManager.target);
    });

    it("delegateGetGovernor: should not allow a non-relayer to get the address of the governor", async function () {
        await expect(governanceManager.connect(deployer).delegateGetGovernor())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateGetNftImplementation: should allow the relayer to get the address of the NFT implementation", async function () {
        const nftImplementationAddress = await governanceManager.connect(relayer).delegateGetNftImplementation();
        expect(nftImplementationAddress).to.equal(nftImplementation.target);
    });

    it("delegateGetNftImplementation: should not allow a non-relayer to get the address of the NFT implementation", async function () {
        await expect(governanceManager.connect(deployer).delegateGetNftImplementation())
            .to.be.revertedWithCustomError(
                governanceManager,
                "OnlyRelayerAllowed"
            );
    });

    it("delegateGetGroupNftAddress: should allow the relayer to get the address of a group's NFT", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        const nftAddress = await governanceManager.connect(relayer).delegateGetGroupNftAddress(groupKey);
        expect(nftAddress).to.be.properAddress;
    });

    it("delegateGetGroupNftAddress: should not allow a non-relayer to get the address of a group's NFT", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(groupKey, nftName, nftSymbol);
        await expect(governanceManager.connect(deployer).delegateGetGroupNftAddress(groupKey))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateGetNullifierStatus: should allow the relayer to get FALSE as the nullifier status of an unused nullifier", async function () {
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier"));
        const isNullifierUsed = await governanceManager.connect(relayer).delegateGetNullifierStatus(groupKey, nullifier);
        expect(isNullifierUsed).to.equal(false);
    });

    it("delegateGetNullifierStatus: should allow the relayer to get TRUE as the nullifier status of a used nullifier", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(validGroupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(validRoot, validGroupKey);
        await governanceManager.connect(relayer).delegateVerifyProof(validProof, validPublicSignals, validGroupKey);
        const isNullifierUsed = await governanceManager.connect(relayer).delegateGetNullifierStatus(validGroupKey, validPublicNullifier);
        expect(isNullifierUsed).to.equal(true);
    });

    it("delegateGetNullifierStatus: should not allow a non-relayer to get the nullifier status", async function () {
        const nullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier"));
        await expect(governanceManager.connect(deployer).delegateGetNullifierStatus(groupKey, nullifier))
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OnlyRelayerAllowed"
            );
    });

    it("delegateVerifyProposal: should allow the relayer to verify a proposal, emit event store correct nullifier and content hash", async function () {
        await governanceManager.connect(relayer).delegateDeployGroupNft(validPropGroupKey, nftName, nftSymbol);
        await governanceManager.connect(relayer).delegateInitRoot(validPropRoot, validPropGroupKey);
        const tx = await governanceManager.connect(relayer).delegateVerifyProposal(validPropProof, validPropPublicSignals, validPropGroupKey, validPropContextKey);
        await expect(tx)    
            .to.emit(
                proposalManager, 
                "ProofVerified"
            ).withArgs(ProofPropContextHash, ProofProposalNullifier, ProofPropContentHash);
        expect(await governanceManager.connect(relayer).delegateGetProposalNullifierStatus(ProofProposalNullifier)).to.equal(true);
        expect(await governanceManager.connect(relayer).delegateGetProposalSubmission(validPropContextKey)).to.equal(ProofPropContentHash);

    });

    it("getRelayer: should allow the owner (deployer) to get the relayer address", async function () {
        const addr = await governanceManager.connect(deployer).getRelayer();
        expect(addr).to.equal(relayerAddress);
    });

    it("getRelayer: should not allow a non-owner to get the relayer address", async function () {
        await expect(governanceManager.connect(user1).getRelayer())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OwnableUnauthorizedAccount"
            );
    });

    it("getMembershipManager: should allow the owner (deployer) to get the address of the MembershipManager", async function () {
        const addr = await governanceManager.connect(deployer).getMembershipManager();
        expect(addr).to.equal(membershipManager.target);
    });

    it("getMembershipManager: should not allow a non-owner to get the address of the MembershipManager", async function () {
        await expect(governanceManager.connect(user1).getMembershipManager())
            .to.be.revertedWithCustomError(
                governanceManager, 
                "OwnableUnauthorizedAccount"
            );
    });


})
