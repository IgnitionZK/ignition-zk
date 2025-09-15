const { ethers, upgrades } = require("hardhat");
const { Conversions } = require("./utils.js");

async function setUpFixtures() {

    // Get Signers
    // Note: "governor" is not the actual governor, just a placeholder used for the tests of the MembershipManager, ProposalManager, VoteManager.
    // The actual governanceManager contract will be set later and used as owner of MM, PM, VM in the GovernanceManager tests.
    const [deployer, governor, relayer, user1, fundingModule] = await ethers.getSigners();
    
    // Get Contract Factories 
    // Managers
    const MembershipManager = await ethers.getContractFactory("MembershipManager");
    const ProposalManager = await ethers.getContractFactory("ProposalManager");
    const VoteManager = await ethers.getContractFactory("VoteManager");
    const GovernanceManager = await ethers.getContractFactory("GovernanceManager");
    // Verifiers
    const MembershipVerifier = await ethers.getContractFactory("MembershipVerifier");
    const ProposalVerifier = await ethers.getContractFactory("ProposalVerifier");
    const ProposalClaimVerifier = await ethers.getContractFactory("ProposalClaimVerifier");
    const VoteVerifier = await ethers.getContractFactory("VoteVerifier");
    // NFT Implementation
    const NFTImplementation = await ethers.getContractFactory("ERC721IgnitionZK");
    // Funding Modules
    const GrantModule = await ethers.getContractFactory("GrantModule");
    // Treasury
    const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
    const TreasuryFactory = await ethers.getContractFactory("TreasuryFactory");
    const BeaconManager = await ethers.getContractFactory("BeaconManager");
    // Mock Contracts
    const MockMembershipVerifier = await ethers.getContractFactory("MockMembershipVerifier");
    const MockProposalVerifier = await ethers.getContractFactory("MockProposalVerifier");
    const MockProposalClaimVerifier = await ethers.getContractFactory("MockProposalClaimVerifier");
    const MockVoteVerifier = await ethers.getContractFactory("MockVoteVerifier");
    const MockERC721 = await ethers.getContractFactory("MockERC721");

    // Ids
    const groupId = '123e4567-e89b-12d3-a456-426614174000'; // Example UUID for group
    const groupId2 = '123e4567-e89b-12d3-a456-426614174003'; // Another group UUID
    const epochId = '123e4567-e89b-12d3-a456-426614174001'; // Example UUID for epoch
    const proposalId = '123e4567-e89b-12d3-a456-426614174002'; // Example UUID for proposal
    
    // Keys
    const groupKey = Conversions.stringToBytes32(groupId);
    const groupKey2 = Conversions.stringToBytes32(groupId2);
    const epochKey = Conversions.stringToBytes32(epochId);
    const proposalKey = Conversions.stringToBytes32(proposalId);

    // Context keys
    const voteContextKey = await Conversions.computeVoteContextKey(groupId, epochId, proposalId);
    const proposalContextKey = await Conversions.computeContextKey(groupId, epochId);

    // Roots
    const rootHash1 = Conversions.stringToBytes32("rootHash1");
    const rootHash2 = Conversions.stringToBytes32("rootHash2");

    // Nullifiers
    const submissionNullifier1 = Conversions.stringToBytes32("submissionNullifier1");
    const submissionNullifier2 = Conversions.stringToBytes32("submissionNullifier2");
    const claimNullifier1 = Conversions.stringToBytes32("claimNullifier1");
    const claimNullifier2 = Conversions.stringToBytes32("claimNullifier2");   
    const voteNullifier1 = Conversions.stringToBytes32("voteNullifier1");
    const voteNullifier2 = Conversions.stringToBytes32("voteNullifier2");
    const voteNullifier3 = Conversions.stringToBytes32("voteNullifier3");
    const voteNullifier4 = Conversions.stringToBytes32("voteNullifier4");

    // Proposal Content hashes
    const contentHash1 = Conversions.stringToBytes32("contentHash1");
    const contentHash2 = Conversions.stringToBytes32("contentHash2");

    // Vote choices
    const voteChoiceNo = 19014214495641488759237505126948346942972912379615652741039992445865937985820n;
    const voteChoiceYes = 18586133768512220936620570745912940619677854269274689475585506675881198879027n;
    const voteChoiceAbstain = 8645981980787649023086883978738420856660271013038108762834452721572614684349n;

    // NFT details
    const nftName = "Test Group NFT";
    const nftSymbol = "GNFT";  
    const nftName2 = "Test Group NFT 2";
    const nftSymbol2 = "GNFT2";  

    // mock proof inputs:
    const mockProof = [
        1, 2, 3, 4, 5, 6,
        7, 8, 9, 10, 11, 12,
        13, 14, 15, 16, 17, 18,
        19, 20, 21, 22, 23, 24
    ];

    // MOCK MEMBERSHIP PUBLIC SIGNALS

    const mockMembershipPublicSignals1 = [
        rootHash1,
        groupKey
    ];

    const mockMembershipPublicSignals2 = [
        rootHash2,
        groupKey
    ];

    // VOTE MOCK PUBLIC SIGNALS 
    
    // mock vote public signals with one vote choice and nullifier:
    const mockVotePublicSignals1 = [
        voteContextKey,
        voteNullifier1,
        voteChoiceNo,
        rootHash1,
        submissionNullifier1
    ];

    // mock vote public signals with another vote choice and nullifier on the same context:
    const mockVotePublicSignals2 = [
        voteContextKey,
        voteNullifier2,
        voteChoiceYes,
        rootHash1,
        submissionNullifier1
    ];

    // mock vote public signals with another vote choice and nullifier on the same context:
    const mockVotePublicSignals3 = [
        voteContextKey,
        voteNullifier3,
        voteChoiceAbstain,
        rootHash1,
        submissionNullifier1
    ];

    // mock vote public signals with another vote and nullifier on the same context:
    const mockVotePublicSignals4 = [
        voteContextKey,
        voteNullifier4,
        voteChoiceYes,
        rootHash1,
        submissionNullifier1
    ];
    
    // MOCK PROPOSAL PUBLIC SIGNALS

    const mockProposalPublicSignals1 = [
        proposalContextKey,
        submissionNullifier1,
        claimNullifier1,
        rootHash1, 
        contentHash1
    ];

    const mockProposalPublicSignals2 = [
        proposalContextKey,
        submissionNullifier2,
        claimNullifier2,
        rootHash2, 
        contentHash2
    ];

    // MOCK PROPOSAL CLAIM PUBLIC SIGNALS

    const mockClaimPublicSignals1 = [
        claimNullifier1,
        submissionNullifier1,
        proposalContextKey
    ];

    const mockClaimPublicSignals2 = [
        claimNullifier2,
        submissionNullifier2,
        proposalContextKey
    ];


    // REAL PROOFS

    // Ids
    const realGroupId = '21fae0f7-096f-4c8f-8515-93b9f247582d';
    const realEpochId = '06134393-4412-4e46-9534-85186ea7bbe8';
    const realProposalId = '5b18c981-c040-4672-bf60-67e1301d3e27';
    // Keys
    const realGroupKey = Conversions.stringToBytes32(realGroupId);
    const realEpochKey = Conversions.stringToBytes32(realEpochId);
    const realProposalKey = Conversions.stringToBytes32(realProposalId);
    // Context keys
    const realVoteContextKey = await Conversions.computeVoteContextKey(realGroupId, realEpochId, realProposalId);
    const realProposalContextKey = await Conversions.computeContextKey(realGroupId, realEpochId);
    // Root
    const realRoot = ethers.toBeHex(8382028473019880437532291517957501217880306914202305497790783762876650668442n);
    
    // REAL MEMBERSHIP PROOF & PUBLIC SIGNALS
    const realMembershipProof =  [           
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

    const realMembershipPublicSignals = [
        8382028473019880437532291517957501217880306914202305497790783762876650668442n,
        2506629824618881676752327261089047969196809530490426743986964496311875247831n
    ];
    const membershipProofRoot = ethers.toBeHex(realMembershipPublicSignals[0], 32);
    const membershipProofGroupHash = ethers.toBeHex(realMembershipPublicSignals[1], 32);

    // REAL VOTE PROOF & PUBLIC SIGNALS
    const realVoteProof = [
        189735893241011753788612289794015149210207199258621036148184829419097508560n,
        17171872476066740978576709771733947447350251925359720632924521125981371058986n,
        6959446371436353248108058931547412959845237274217394645843161207438976403098n,
        13053389797114611259139175327096868673669713404282382329463170162732213450288n,
        14994772132880978102372368071430914241116854448287823523197793252284899327900n,
        12668642396473385438510609998199146098277282509497822492430297541202519139214n,
        15855473328418959070560022884695986629973237600879686417585015708071635549396n,
        1849602699936368480164426517915325589026615464156043968950638177666218147928n,
        21730041603394437838382904633191394329485300446292030255056023273439716296618n,
        3293501494591433328762465539372868739087211955835781789093725583597656127265n,
        7614203553100022728469705650589155636366235399350800285561152856315912200697n,
        18318941323029776504270696698634945558724444560624568214224855447189066140399n,
        3103890193635031226566270615187961346150955985469367044642403907200966109422n,
        17566155047561621990328050308658323800896424960371973042495134763053247519717n,
        8365195188463780739250321040819913578563016496220999919138362385009833755792n,
        15608837747785659966833994940802294972197576715817595224189060134791661175006n,
        9947915468715299550526046525633833630436367851595022310411961647626869742673n,
        14675813785817491637287564075752357318602953975839964078458804221244643806336n,
        11101586298072150491803447937655092900884173871837601558505151390566993955588n,
        3470316667468339479389105745822266474346445214269916376968692796644987886267n,
        9656040154698143158772926452981249992301449955832112082963009737787619610525n,
        13152332682125919977709048836226281407521882260578142953666311830533435242119n,
        14697699302074971314657472041277248916916534860896707297911775422385604831641n,
        10660335185851144346379250010307575871420841485601296470346485291509455874813n
    ];

    const realVotePublicSignals = [
        12417957784691345063069918387226828600187557829716594172267574950900505522223n,
        21007579385376765008226274111057452106701207043545364523489130415023884686357n,
        18586133768512220936620570745912940619677854269274689475585506675881198879027n,
        8382028473019880437532291517957501217880306914202305497790783762876650668442n,
        11437135861965939255357707860095145538920168988595282139508950839172378710733n
    ];
    // public signals
    const voteProofContextHash = ethers.toBeHex(realVotePublicSignals[0], 32);
    const voteProofNullifier = ethers.toBeHex(realVotePublicSignals[1], 32);
    const voteProofChoice = ethers.toBeHex(realVotePublicSignals[2], 32);
    const voteProofRoot = ethers.toBeHex(realVotePublicSignals[3], 32);
    const voteProofSubmissionNullifier = ethers.toBeHex(realVotePublicSignals[4], 32);

    // REAL PROPOSAL PROOF & PUBLIC SIGNALS
    const realProposalProof =  [
            4160082357726907288154962751768800619364547905185501987938567395992963626756n,
            8625191419888166001787288936525491236965189171168431531580450179034558022628n,
            8663426768450541325893863068057652087373433414669976966805392185357166988298n,
            4370380180872603991303613753283339003660679138439446445411511540846534579473n,
            14535668297481111487584752732259061609062369960463252113342295661612480217875n,
            13464746825577454986616840409467983179939738709257645654324715365483280308240n,
            12482547363391314789048825926158576636653280918225939537422051376247206025379n,
            6425173490738242109124751003607921391818549286250922120905300269803872297520n,
            21867122944002752806844061013556642734340120630422574202220999464430872253739n,
            18303335069190759842167583153896225853680476424013584621050786623335449686685n,
            6227545735508585745608419115002984035075442362970894397791904138026328673325n,
            14382361922826105148392868704816988202231434486726405491561867922774534631091n,
            9552428347965547746691501869392784606122155596379513751104949012052750544211n,
            2302755567771284608940437217367815749744276219766254297504221627205993546298n,
            19871946349315711705904003513613176206359316972300765120626593295263110998032n,
            3323578654821101975665354060651301996026442820081832378114947301446748033323n,
            3010626687343341210674142569935787964497430514255055837156821427657034889090n,
            20814825545369736445078060111030960560292045692197797944294659313624178305723n,
            8809555674879872451626294962074150505479982682178138755219803710877310372357n,
            1551989834106132465664208243483421133538165958314739599389780100567667732048n,
            712496314335736147322087972926575111220098174587906109568858392078735395668n,
            2011994745874617327408216421498351059169876092504697566598493992683855101105n,
            17407614594591813575087546676494537031868753905141623450388448398354606953774n,
            19925841242912817942652827919213205403554809012254685308740983652900643995042n
        ];

        const realProposalPublicSignals = [
            10784837327942539940262199572332172861641502897581390099206106957093606019065n,
            11437135861965939255357707860095145538920168988595282139508950839172378710733n,
            18657539368208857675267473580234674446480662122335439399989949196824462772537n,
            8382028473019880437532291517957501217880306914202305497790783762876650668442n,
            4227634804796440866596074335636719855117858676967569745568900499808312409208n
        ];
        const proposalProofContextHash = ethers.toBeHex(realProposalPublicSignals[0], 32);
        const proposalProofSubmissionNullifier = ethers.toBeHex(realProposalPublicSignals[1], 32);
        const proposalProofClaimNullifier = ethers.toBeHex(realProposalPublicSignals[2], 32);
        const proposalProofRoot = ethers.toBeHex(realProposalPublicSignals[3], 32);
        const proposalProofContentHash = ethers.toBeHex(realProposalPublicSignals[4], 32);

        // Real claim proof inputs
        const realClaimProof = [       
            17022331385491674352656711953572521334764478826855946644636639963938221138413n,
            13337814841785982322066856443939408100968278096512154546697259056428429584094n,
            8883627696396774374357596422972368278011072566085500716483555474754647564880n,
            5438389370482609175775618075204450083954805113708375793323243869015057601338n,
            6374740200591525703549142787463554041675631437883820441502575678351557131796n,
            13387079409746748113007800474053907895840107982340179099597766196784974628091n,
            20629616285169984666713518995120722745602095075070123925245113269902058659715n,
            10839288422678664499811083521520036398385931316745759488209591614033422711300n,
            9179551507929582257092430526783606917123042311680961270553288412408483991n,
            4644079564805158252918109860134909564745972357973182387883736159551091614454n,
            4836649542050320363278663492077397639479099273406457765089203615520299906911n,
            14821584109745652907827166850740593603967080112453213443093852511391780831164n,
            8776842109124755821482698920281245695037982148421048179581669504061849457375n,
            17249709923036293211235032073846080957568089077345548342437778640774874525220n,
            12787412407414482081427135293389433704689940515527535533457097261196022783631n,
            5193929429869679588142346251997675979203081582481432677113650182748612673264n,
            5724811214610435675026298931259868477631400132202027438663902112076766389553n,
            10987109609173640378042984797428872255421003208080005028994376853078165031572n,
            13819930228950491354084334551567566975985914459182249330260977602831388358273n,
            10419181180601177277516732109696985589616135635552566285580719655557627216936n,
            19474163458552574499479589850520692943944105435988781409290709534298908192326n,
            11336422004633526528374124157024614104309973643386717948558256508497276422392n,
            15534725659224339149667733889992013871633648659281584426665332857365408128934n,
            7141974369526416983448047383179455418470281347379905821373483403101987276473n
        ];      
        
        const realClaimPublicSignals = [
            18657539368208857675267473580234674446480662122335439399989949196824462772537n,
            11437135861965939255357707860095145538920168988595282139508950839172378710733n,
            10784837327942539940262199572332172861641502897581390099206106957093606019065n
        ];


    return {
        deployer,
        governor,
        relayer,
        user1,
        fundingModule,

        MembershipManager,
        ProposalManager,
        VoteManager,
        GovernanceManager,
        NFTImplementation,
        GrantModule,
        TreasuryFactory,
        TreasuryManager,
        BeaconManager,
        MembershipVerifier,
        MockMembershipVerifier,
        ProposalVerifier,
        ProposalClaimVerifier,
        VoteVerifier,
        MockProposalVerifier,
        MockProposalClaimVerifier,
        MockVoteVerifier,
        MockERC721,

        groupId, groupId2, epochId, proposalId, groupKey, groupKey2, epochKey, proposalKey, 
        voteContextKey, proposalContextKey, rootHash1, rootHash2, 
        submissionNullifier1, submissionNullifier2, claimNullifier1, claimNullifier2,
        voteNullifier1, voteNullifier2, voteNullifier3, voteNullifier4, 
        contentHash1, contentHash2, nftName, nftSymbol, nftName2, nftSymbol2,
        voteChoiceNo, voteChoiceYes, voteChoiceAbstain,

        mockProof,

        mockMembershipPublicSignals1,
        mockMembershipPublicSignals2,

        mockVotePublicSignals1,
        mockVotePublicSignals2,
        mockVotePublicSignals3,
        mockVotePublicSignals4,

        mockProposalPublicSignals1,
        mockProposalPublicSignals2,
        mockClaimPublicSignals1,
        mockClaimPublicSignals2,

        mockProposalPublicSignals1,

        realGroupId, realEpochId, realProposalId, realGroupKey, realEpochKey, realProposalKey,
        realVoteContextKey, realProposalContextKey, realRoot,

        realVoteProof,
        realVotePublicSignals,
        voteProofContextHash,
        voteProofNullifier,
        voteProofChoice,
        voteProofRoot,
        voteProofSubmissionNullifier,

        realProposalProof,
        realProposalPublicSignals,
        proposalProofContextHash,
        proposalProofSubmissionNullifier,
        proposalProofClaimNullifier,
        proposalProofRoot,
        proposalProofContentHash,

        realClaimProof,
        realClaimPublicSignals,

        realMembershipProof,
        realMembershipPublicSignals,
        membershipProofRoot,
        membershipProofGroupHash,

        membershipManager: null,
        proposalManager: null,
        voteManager: null,
        governanceManager: null,
        nftImplementation: null,
        grantModule: null,
        treasuryManager: null, 
        treasuryFactory: null, 
        beaconManager: null,
        membershipVerifier: null,
        proposalVerifier: null,
        proposalClaimVerifier: null,
        voteVerifier: null,
        mockProposalVerifier: null,
        mockProposalClaimVerifier: null,
        mockVoteVerifier: null,
        mockMembershipVerifier: null,
        mockERC721: null
    }
}

async function deployFixtures() {
    const fixtures = await setUpFixtures();

    // Deploy contracts
    // Deploy the NFT implementation minimal proxy (Clones EIP‑1167) contract
    fixtures.nftImplementation = await fixtures.NFTImplementation.deploy();
    await fixtures.nftImplementation.waitForDeployment();

    // Deploy the MembershipVerifier contract
    fixtures.membershipVerifier = await fixtures.MembershipVerifier.deploy();
    await fixtures.membershipVerifier.waitForDeployment();

    // Deploy the MockMembershipVerifier contract
    fixtures.mockMembershipVerifier = await fixtures.MockMembershipVerifier.deploy();
    await fixtures.mockMembershipVerifier.waitForDeployment();

    fixtures.mockERC721 = await fixtures.MockERC721.deploy();
    await fixtures.mockERC721.waitForDeployment();

    // Deploy the MembershipManager UUPS Proxy (ERC‑1967) contract
    fixtures.membershipManager = await upgrades.deployProxy(
        fixtures.MembershipManager, 
        [
            await fixtures.governor.getAddress(),
            fixtures.nftImplementation.target,
            fixtures.membershipVerifier.target
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await fixtures.membershipManager.waitForDeployment();

    // Deploy a second instance of the MembershipManager with the mock ERC721 contract that reverts when safeMint is called
    fixtures.membershipManagerWithMockNft = await upgrades.deployProxy(
        fixtures.MembershipManager, 
        [
            await fixtures.governor.getAddress(),
            fixtures.mockERC721.target,
            fixtures.membershipVerifier.target
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await fixtures.membershipManagerWithMockNft.waitForDeployment();

    // Deploy ProposalVerifier contract
    fixtures.proposalVerifier = await fixtures.ProposalVerifier.deploy();
    await fixtures.proposalVerifier.waitForDeployment();

    // Deploy MockProposalVerifier contract
    fixtures.mockProposalVerifier = await fixtures.MockProposalVerifier.deploy();
    await fixtures.mockProposalVerifier.waitForDeployment();

    // Deploy ProposalClaimVerifier contract
    fixtures.proposalClaimVerifier = await fixtures.ProposalClaimVerifier.deploy();
    await fixtures.proposalClaimVerifier.waitForDeployment();

    // Deploy MockProposalClaimVerifier contract
    fixtures.mockProposalClaimVerifier = await fixtures.MockProposalClaimVerifier.deploy();
    await fixtures.mockProposalClaimVerifier.waitForDeployment();

    // Deploy ProposalManager UUPS Proxy (ERC‑1967) contract
    fixtures.proposalManager = await upgrades.deployProxy(
        fixtures.ProposalManager, 
        [
            await fixtures.governor.getAddress(),
            fixtures.proposalVerifier.target, 
            fixtures.proposalClaimVerifier.target,
            fixtures.membershipManager.target
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await fixtures.proposalManager.waitForDeployment();

    // Deploy VoteVerifier contract
    fixtures.voteVerifier = await fixtures.VoteVerifier.deploy();
    await fixtures.voteVerifier.waitForDeployment();

    // Deploy MockVoteVerifier contract
    fixtures.mockVoteVerifier = await fixtures.MockVoteVerifier.deploy();
    await fixtures.mockVoteVerifier.waitForDeployment();

    // Deploy VoteManager UUPS Proxy (ERC‑1967) contract
    fixtures.voteManager = await upgrades.deployProxy(
        fixtures.VoteManager,
        [
            await fixtures.governor.getAddress(),
            fixtures.voteVerifier.target,
            fixtures.membershipManager.target,
            fixtures.proposalManager.target
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await fixtures.voteManager.waitForDeployment();

    // Deploy the Governance UUPS Proxy (ERC‑1967) contract
    fixtures.governanceManager = await upgrades.deployProxy(
        fixtures.GovernanceManager, 
        [
            await fixtures.deployer.getAddress(),  // _initialOwner
            await fixtures.relayer.getAddress(), // _relayer
            fixtures.membershipManager.target, // _membershipManager
            fixtures.proposalManager.target, // _proposalManager,
            fixtures.voteManager.target // _voteManager
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await fixtures.governanceManager.waitForDeployment();

    // Deploy TreasuryManager without initialization
    fixtures.treasuryManager = await fixtures.TreasuryManager.deploy();
    await fixtures.treasuryManager.waitForDeployment();

    // Deploy BeaconManager with the TreasuryManager implementation address and temp owner
    fixtures.beaconManager = await fixtures.BeaconManager.deploy(
        fixtures.treasuryManager.target,
        await fixtures.deployer.getAddress() // temp owner
    );
    await fixtures.beaconManager.waitForDeployment();

    // Deploy TreasuryFactory with the BeaconManager address
    /*
    fixtures.treasuryFactory = await fixtures.TreasuryFactory.deploy(
        fixtures.beaconManager.target,
        //fixtures.governanceManager.target,
        await fixtures.governor.getAddress() // use EOA governor signer for testing
    );
    await fixtures.treasuryFactory.waitForDeployment();

    // Set TreasuryFactory address in GovernanceManager
    await fixtures.governanceManager.connect(deployer).setTreasuryFactory(fixtures.treasuryFactory.target);
    
    // Deploy the GrantModule UUPS Proxy (ERC‑1967) contract
    fixtures.grantModule = await upgrades.deployProxy(
        fixtures.GrantModule,
        [
            await fixtures.governanceManager.target
            // await fixtures.governor.getAddress() // use EOA governor signer for testing
        ],
        {
            initializer: "initialize",
            kind: "uups"
        }
    );
    await fixtures.grantModule.waitForDeployment();

    // Set grant module address in GovernanceManager
    await fixtures.governanceManager.connect(deployer).addFundingModule(
        //fixtures.grantModule.target,
        fixtures.fundingModule.getAddress(), 
        ethers.id("grant")
    );
    */
    return fixtures;
}

 module.exports = {
    setUpFixtures,
    deployFixtures
};
