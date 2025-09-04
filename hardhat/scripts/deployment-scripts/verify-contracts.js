// scripts/verify-contracts.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    
    const RELAYER = "0x5F909fd25A9F5e4f5a219318FdeD6C8124F6c1F1";
    const IGNITIONZK_MULTISIG = "0x5E42277e70102B6932727DA70f19Df8b6feD15E3";

    // REPLACE WITH DEPLOYED_ADDRESSES IN update-deployment-addresses.js
    const DEPLOYED_ADDRESSES = {
        // Step 0 - Verifier Contracts
        MEMBERSHIP_VERIFIER: "0xf1b3963996420a1765B452AB51ad7b52e94F9C1d", // FROM STEP 0
        PROPOSAL_VERIFIER: "0x472Ad7b69eB3C6a2F885933b96D8D4Ef111bc8bd", // FROM STEP 0
        PROPOSAL_CLAIM_VERIFIER: "0x7a2ED32E1C83981F7160fFb61275a9d29b007d9e", // FROM STEP 0
        VOTE_VERIFIER: "0x1FC190Ad4A867B8d334b16838A6569a05f301dC2", // FROM STEP 0

        // Step 1 - ERC721 Implementation
        NFT_IMPLEMENTATION: "0x7C33a33561C0CFa6EECA18239A119d3FD3267B2A", // FROM STEP 1

        // Step 2 - Manager Contracts
        MEMBERSHIP_MANAGER: "0x6057397CDc44eEb0c7996b90AB8DA9d16751b0C0", // FROM STEP 2
        PROPOSAL_MANAGER: "0xd43C76D7Abba3025A6106755655Bdb3ed8CcCD5c", // FROM STEP 2
        VOTE_MANAGER: "0x786A314A1902e714e2994D6Fc90ee871B2473CCF", // FROM STEP 2

        // Step 3 - Governance
        GOVERNANCE_MANAGER: "0x364773751c69f6ED23f9C65Eec28Aa4444fc76fB", // FROM STEP 3

        // Step 5 - Treasury
        TREASURY_MANAGER: "0x3D027020bE4948A7fD2c1e7439cfC8E1ac54eCbf",
        BEACON_MANAGER: "0xCDa3943dD4a5AC419A2082A06e69e1DB4DeE7801",
        TREASURY_FACTORY: "0x993b458cC00a705ed2295edDb6f21C15Fde67A26",

        // Step 6 - Funding Modules
        GRANT_MODULE: "0x29459a616839dB193B7815c71c56C6c2890BD276"
    };

    const addresses = {
        // Step 0: Verifiers
        membershipVerifier: DEPLOYED_ADDRESSES.MEMBERSHIP_VERIFIER,
        proposalVerifier: DEPLOYED_ADDRESSES.PROPOSAL_VERIFIER,
        proposalClaimVerifier: DEPLOYED_ADDRESSES.PROPOSAL_CLAIM_VERIFIER,
        voteVerifier: DEPLOYED_ADDRESSES.VOTE_VERIFIER,
        
        // Step 1: ERC721 Implementation
        erc721Implementation: DEPLOYED_ADDRESSES.NFT_IMPLEMENTATION,
        
        // Step 2: Managers
        membershipManager: {
        proxy: DEPLOYED_ADDRESSES.MEMBERSHIP_MANAGER,
        implementation: await upgrades.erc1967.getImplementationAddress(DEPLOYED_ADDRESSES.MEMBERSHIP_MANAGER),
        },
        proposalManager: {
        proxy: DEPLOYED_ADDRESSES.PROPOSAL_MANAGER,
        implementation: await upgrades.erc1967.getImplementationAddress(DEPLOYED_ADDRESSES.PROPOSAL_MANAGER),
        },
        voteManager: {
        proxy: DEPLOYED_ADDRESSES.VOTE_MANAGER,
        implementation: await upgrades.erc1967.getImplementationAddress(DEPLOYED_ADDRESSES.VOTE_MANAGER),
        },
        
        // Step 3: Governance Manager
        governanceManager: {
        proxy: DEPLOYED_ADDRESSES.GOVERNANCE_MANAGER,
        implementation: await upgrades.erc1967.getImplementationAddress(DEPLOYED_ADDRESSES.GOVERNANCE_MANAGER),
        },
        
        // Step 5: Treasury contracts
        treasuryManager: DEPLOYED_ADDRESSES.TREASURY_MANAGER,
        beaconManager: DEPLOYED_ADDRESSES.BEACON_MANAGER,
        treasuryFactory: DEPLOYED_ADDRESSES.TREASURY_FACTORY,
        
        // Step 6: Funding Modules
        grantModule: {
        proxy: DEPLOYED_ADDRESSES.GRANT_MODULE,
        implementation: await upgrades.erc1967.getImplementationAddress(DEPLOYED_ADDRESSES.GRANT_MODULE),
        },
    };

    console.log("Starting contract verification...");

    async function isContractVerified(address, network = "sepolia") {
        try {
            const apiKey = process.env.ETHERSCAN_API_KEY;
            const url = `https://api-${network}.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            return data.status === "1";
        } catch (error) {
            console.log(`Error checking verification status: ${error.message}`);
            return false;
        }
    }

    async function verifyContract(address, name, constructorArgs) {
        const verified = await isContractVerified(address);
        if (verified) {
            console.log(`✅ ${name} already verified, skipping...`);
        } else {
            console.log(`⏳ Verifying ${name}...`);
            await hre.run("verify:verify", {
            address: address,
            constructorArguments: constructorArgs
            });
            console.log(`✅ ${name} verified successfully!`);
        }
    }

    // Verify each contract one by one
    try {
        // Verify the verifiers (no constructor args)
        let verified;
        console.log("📄 Verifying verifier contracts...");

        console.log("⏳ 1. Verifying the MembershipVerifier...");
        await verifyContract(addresses.membershipVerifier, "MembershipVerifier", []);

        console.log("⏳ 2. Verifying the ProposalVerifier...");
        await verifyContract(addresses.proposalVerifier, "ProposalVerifier", []);

        console.log("⏳ 3. Verifying the ProposalClaimVerifier...");
        await verifyContract(addresses.proposalClaimVerifier, "ProposalClaimVerifier", []);

        console.log("⏳ 4. Verifying the VoteVerifier...");
        await verifyContract(addresses.voteVerifier, "VoteVerifier", []);

        // Verify the ERC721 implementation
        console.log("⏳ Verifying ERC721 implementation...");
        await verifyContract(addresses.erc721Implementation, "ERC721 implementation", []);
        
        // Verify manager implementations
        console.log("📄 Verifying manager implementations...");

        console.log("⏳ 1. Verifying MembershipManager implementation...");
        await verifyContract(
            addresses.membershipManager.implementation, 
            "MembershipManager implementation", 
            []
        );

        console.log("⏳ 2. Verifying ProposalManager implementation...");
        await verifyContract(
            addresses.proposalManager.implementation, 
            "ProposalManager implementation", 
            []
        );

        console.log("⏳ 3. Verifying VoteManager implementation...");
        await verifyContract(
            addresses.voteManager.implementation, 
            "VoteManager implementation", 
            []
        );

        console.log("⏳ 4. Verifying GovernanceManager implementation...");
        await verifyContract(
            addresses.governanceManager.implementation, 
            "GovernanceManager implementation", 
            []
        );

        console.log("🏛️ Verifying treasury contracts...");

        console.log("⏳ 1. Verifying TreasuryManager...");
        await verifyContract(
            addresses.treasuryManager, 
            "TreasuryManager implementation", 
            []
        );

        console.log("⏳ 2. Verifying TreasuryFactory...");
        await verifyContract(
            addresses.treasuryFactory,
            "TreasuryFactory implementation", 
            [
                DEPLOYED_ADDRESSES.BEACON_MANAGER,
                DEPLOYED_ADDRESSES.GOVERNANCE_MANAGER,
                DEPLOYED_ADDRESSES.MEMBERSHIP_MANAGER
            ]
        );

        console.log("⏳ 3. Verifying BeaconManager...");
        await verifyContract(
            addresses.beaconManager,
            "BeaconManager implementation", 
            [
                DEPLOYED_ADDRESSES.TREASURY_MANAGER,
                IGNITIONZK_MULTISIG
            ]
        );

        console.log("📄 Verifying funding module implementations...");

        console.log("⏳ 1. Verifying GrantModule...");
        await verifyContract(
            addresses.grantModule.implementation,
            "GrantModule implementation", 
            []
        );
        
        console.log("📄 Verifying proxies...");

        // Replace the proxy verification sections with:
        console.log("📄 Manual proxy verification required...");
        console.log("For each proxy, follow these steps on Etherscan:");
        console.log("1. Go to the proxy address");
        console.log("2. Click 'More Options' -> 'Is this a proxy?' -> 'Verify'");
        console.log("3. Enter the implementation address when prompted");

        console.log("\nMembershipManager Proxy: " + addresses.membershipManager.proxy);
        console.log("Implementation: " + addresses.membershipManager.implementation);

        console.log("\nProposalManager Proxy: " + addresses.proposalManager.proxy);
        console.log("Implementation: " + addresses.proposalManager.implementation);

        console.log("\nVoteManager Proxy: " + addresses.voteManager.proxy);
        console.log("Implementation: " + addresses.voteManager.implementation);

        console.log("\nGovernanceManager Proxy: " + addresses.governanceManager.proxy);
        console.log("Implementation: " + addresses.governanceManager.implementation);
        
        console.log("\nGrantModule Proxy: " + addresses.grantModule.proxy);
        console.log("Implementation: " + addresses.grantModule.implementation);

        console.log("✅ All contracts verified successfully!");
        
    } catch (error) {
        console.error("Verification failed:", error);
    }
}

    main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });