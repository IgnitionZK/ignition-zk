const { ethers } = require("hardhat");

async function main() { 

    function findMatchingError(selector, candidates) {
    for (const err of candidates) {
        const id = ethers.id(err).slice(0, 10);
        if (id === selector) {
        console.log(`Match found: ${err} => ${id}`);
        }
    }
    }

    const selector = "0x44953053";

    const errorSignatures = [
        "OwnableUnauthorizedAccount()",
        "RootCannotBeZero()",        
        "InvalidMerkleRoot()",
        "NewRootMustBeDifferent()",
        "RootNotYetInitialized()",
        "RootAlreadyInitialized()",
        "GroupNftNotSet()",
        "GroupNftAlreadySet()",
        "NftAddressCannotBeZero()",
        "NftMustBeERC721()",
        "InvalidNftNameLength()",
        "InvalidNftSymbolLength()",
        "InvalidNftSymbolLength()",
        "MintingFailed(string reason)",
        "InvalidProof(bytes32 groupKey)",
        "InvalidGroupKey()",
        "MemberAlreadyHasToken()",
        "MemberDoesNotHaveToken()",
        "MemberBatchTooLarge()",
        "NoMembersProvided()",
        "MemberMustBeEOA()",
        "KeyCannotBeZero()",
        "AddressCannotBeZero()",
        "AddressIsNotAContract()",
        "AddressDoesNotSupportInterface()"
    ];
    
    findMatchingError(selector, errorSignatures);

    // 0x44953053

    const originalGroupId = '3ac03f73-b1b2-4358-88ef-82dd58c0870a';
    const bytes32GroupId = ethers.toBeHex(ethers.keccak256(ethers.toUtf8Bytes(originalGroupId)), 32);
    const bytes32GroupIdWithModularReduction = ethers.toBeHex(
    BigInt(ethers.keccak256(ethers.toUtf8Bytes(originalGroupId))) %
    BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617"),
    32
    );  

    console.log("Original groupId:", originalGroupId);
    console.log("Bytes32 representation of groupId:", bytes32GroupId);
    console.log("Bytes32 representation with modular reduction:", bytes32GroupIdWithModularReduction);

    // GM 0x96CebDEddF629537Ae5757fDB13AD3820A550f1D
    // get contract at:
    const contractAddress = "0x96CebDEddF629537Ae5757fDB13AD3820A550f1D";
    const contract = await ethers.getContractAt("GovernanceManager", contractAddress);

    

}

main().catch(console.error);
