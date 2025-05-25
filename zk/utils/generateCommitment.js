/**
 * ZK Identity Commitment Generator
 * @notice Generates the user-specific identity commitment values for the ZK circuits
 * @dev This scripts generates an identity commitment with the following process:
 * 1. Performs ERC721 ownership token check as a membership eligibility crtiterion.
 * 2. Uses BIP39 to derive a mnemonic phrase and deterministically derives a secret seed from it.
 * 3. Leverages HKDF (HMAC-based Key Derivation Function), to transform this seed (a source of entropy) into two distinct,
 * cryptographically secure secret keys: the identity secret (zkSecretIdentity) and the secret nullifer (zkIdentityNullifier).
 * 4. Uses the ZK-circuit-efficient Poseidon hash function, to combine these two keys into the final ZK Identity Commitment. 
 */

require("dotenv").config();
const { ethers, JsonRpcProvider } = require("ethers");
const bip39 = require("bip39");
const circomlib = require("circomlibjs");
const hkdf = require("futoin-hkdf");

/**
 * Configuration of constant variables for the ZK Identity System.
 * @dev Below are some of the critical parametrs used for the ZK Identity derivation.
 * @param {Buffer} APP_SALT - application-specific salt used within the HDKF derivation process.
 * Ensures that the keys are unique, even with identical input key material across different contexts.
 * @param {Buffer} ZK_SECRET_INFO - contextual information string used during HKDF to derive the unique secret key. 
 * It provides domain separation.
 * @param {Buffer} ZK_NULLIFIER_INFO - contextual information string used during HKDF to derive the unique nullifier key. 
 * It ensures independence from the identity secret.
 * @param {number} DERIVED_KEY_BYTE_LENGTH - the desired byte length of the zk secret keys computed with HKDF (eg., 32 for 256-bit keys).
 * @param {string} BIP39_ZK_IDENTITY_DERIVATION_PATH - a custom BIP39 derivation path for the zk identity.  Format: m / purpose' / category' / index'.
 * The chosen path `m/1337'/0'/0'` was designed to avoid collisions with standard derivation paths used by cryptocurrency wallets.
 * @param {number} ENTROPY_BITS - the number of entropy bits used for the generation of the BIP39 mnemonic phrase.
 */
const APP_SALT = Buffer.from("IgnitionZK_salt_v1");
const ZK_SECRET_INFO = Buffer.from("ZK_IDENTITY_SECRET");
const ZK_NULLIFIER_INFO = Buffer.from("ZK_IDENTITY_NULLIFIER");
const DERIVED_KEY_BYTE_LENGTH = 32; 
const BIP39_ZK_IDENTITY_DERIVATION_PATH = "m/1337'/0'/0'";
const ENTROPY_BITS = 128;

/**
 * @notice Checks if a given address is an eligible or valid member of the DAO.
 * @dev Address has to be the owner of an ERC721 token to be a member.
 * @param {string} address - The wallet address whose ERC721 token balance we want to check
 * @param {ethers.Contract} contract - ERC721 contract instance
 * @returns {boolean} - Boolean indicating whether the wallet address holds the ERC721 token
 * If true, the address is an eligible member of the DAO.
 */
const isMember = async (contract, address) => {
    const balance = await contract.balanceOf(address);
    return balance > BigInt(0);
}

/**
 * @notice Computes the Poseidon Hash of the given inputs.
 * @dev Initializes the Poseidon instance on the first call.
 * @param {BigInt[]} inputs - an Array of BigInt input values to be hashed.
 * @returns {Promise<BigInt>} - A Promise that resolves to a BigInt representing the Poseidon hash output.
 */
let poseidon;
const poseidonHash = async (inputs) => {
    if(!poseidon) {
        poseidon = await circomlib.buildPoseidon();
    }
    return poseidon.F.toObject(poseidon(inputs));
}

/**
 * @notice Generates the secret seed based on a BIP39 mnemonic phrase.
 * @dev This function produces a secure 512-bit seed by combining the BIP39 mnemonic phrase with a secret (optional) passphrase.
 * The 512-bit seed is suitable for deterministic key derivation.
 * @param {number} ENTROPY_BITS - Number of entropy bits. 128 bits -> 12 random words.
 * @param {string} secretPassphrase - A passphrase to be combined with the mnemonic to enhance security.
 * @returns {Promise<Buffer>} - A Promise that resolves to a 512-bit (64 bytes) seed from which the deterministic keys will be derived.
 */
const generateBIP39Seed = async (ENTROPY_BITS, secretPassphrase) => {
     
    const mnemonic = bip39.generateMnemonic(ENTROPY_BITS);
    console.log(`The following mnemonic was generated: ${mnemonic}`);

    return await bip39.mnemonicToSeed(mnemonic, secretPassphrase);
}


/**
 * @notice Generates the deterministic ZK (identity) secret keys: zkIdentitySecret and zkIdentityNullifier.
 * @dev The secret keys are derived from the Input Key Material (IKM) using HKDF (HMAC-based Key Derivation Function) and the futoin-hdkf package.
 * The derived secret keys are then converted to BigInts to be suitable as inputs to the Poseidon hash function.
 * @param {Buffer} ikm - IKM (Input Key Material): usually the cryptographic seed derived key from the mnemonic phrase. 
 * @param {number} keyLen - the desired byte length for each derived secret key.
 * @param {Buffer} salt - an application specific salt used in HKDF.
 * @param {Buffer} infoSecret - contextual information string used during HKDF to derive the unique secret key. 
 * @param {Buffer} infoNullifier -contextual information string used during HKDF to derive the unique nullifer key. 
 * @param {String} hashFn - the name of the hash function to be used by HKDF.
 * @returns {{zkIdentitySecret: BigInt, zkIdentityNullifier: BigInt}} - An object containing the two derived ZK secret keys.
 */ 
const generateZkSecrets = (ikm, keyLen, salt, infoSecret, infoNullifier, hashFn) => {
    
    const zkIdentitySecretRaw = hkdf(ikm, keyLen, {
        salt: salt,
        info: infoSecret,
        hash: hashFn
    });

    const zkIdentityNullifierRaw = hkdf(ikm, keyLen, {
        salt: salt,
        info: infoNullifier,
        hash: hashFn
    });

    console.log(`zkIdentitySecretRaw (Buffer) -- number of bytes: ${zkIdentitySecretRaw.length} -- hex value: ${zkIdentitySecretRaw.toString("hex")}`);
    console.log(`zkIdentityNullifierRaw (Buffer) -- number of bytes: ${zkIdentityNullifierRaw.length} -- hex value: ${zkIdentityNullifierRaw.toString("hex")}`);

    // Poseidon expects BigInt as inputs
    // convert keys from Buffer to BigInt
    const zkIdentitySecret = BigInt("0x" + zkIdentitySecretRaw.toString("hex"));
    const zkIdentityNullifier = BigInt("0x" + zkIdentityNullifierRaw.toString("hex"));

    return { zkIdentitySecret, zkIdentityNullifier };
}

/**
 * @notice Generates the final identity commitment (public value) for a ZK proof.
 * @dev The zk identity commitment is computed by taking the Poseidon hash of the two identity secret keys (zkIdentitySecret and zkIdentityNullifier).
 * @param {BigInt} zkIdentitySecret - zk identity secret key derived with HKDF from the BIP39 mnenomic and its corresponding info string.
 * @param {BigInt} zkIdentityNullifier - zk identity nullifier key derived with HKDF from the BIP39 mnenomic and its corresponding info string.
 * @returns {Promise<BigInt>} - a Promise that resolves to the BigInt value representing the identity commitment.
 */ 
const generateCommitment = (zkIdentitySecret, zkIdentityNullifier) => {
    
    const poseidonInputs = [
        zkIdentitySecret,
        zkIdentityNullifier
    ];

    return poseidonHash(poseidonInputs);
}

async function main() {

    const tokenAddress = process.env.ERC721_ADDRESS;
    const privateKey = process.env.PRIVATE_KEY;
    const alchemyUrl = process.env.ALCHEMY_SEPOLIA_URL;

    // ERC721 Gating: ownership of the ERC721 token is mandatory for ZK identity creation
    if (tokenAddress && privateKey && alchemyUrl) {

        try {
            const ABI = [
                "function balanceOf(address owner) view returns (uint256)"
            ];
            const provider = new ethers.JsonRpcProvider(alchemyUrl);
            const wallet = new ethers.Wallet(privateKey, provider);
            const contract = new ethers.Contract(tokenAddress, ABI, provider);
          
            const isValidMember = await isMember(contract, wallet.address);
            console.log(`The user with address ${wallet.address} is a current member (owns ERC721 token):`, isValidMember);

            // if not a valid member, terminate with an error
            if(!isValidMember) {
                console.warn("The user is not an owner of the ERC721 token and is therefore not a valid member.");
                console.error("Critical error: membership is mandatory for identity creation");
                process.exit(1);
            }

        } catch(error) {
            console.error("There was an error during the ERC721 check:", error);
            process.exit(1);
        }

    } else {
        console.log("ERC721_ADDRESS, PRIVATE_KEY or ALCHEMY_SEPOLIA_URL not properly set in .env. ERC721 check cannot be performed.")
    }
    
    // (optional) user-defined passphrase:
    const passphrase = "this is my secret passphrase";

    // 512-bit seed generated from the 128-bit mnemonic and passphrase
    const seed = await generateBIP39Seed(ENTROPY_BITS, passphrase);
    console.log(`The secret seed derived from the mnemonic and the passphrase is of type: ${typeof seed}, with number of bytes: ${seed.length}, and hex representation: ${seed.toString("hex")}`);

    // zkSecrets
    const { zkIdentitySecret, zkIdentityNullifier } = generateZkSecrets(
        seed, // use the seed as the ikm (simplified case)
        DERIVED_KEY_BYTE_LENGTH, 
        APP_SALT, 
        ZK_SECRET_INFO, 
        ZK_NULLIFIER_INFO, 
        "sha256"
    );

    console.log(`zkIdentitySecret (BigInt): ${zkIdentitySecret}`);
    console.log(`zkIdentityNullifier (BigInt): ${zkIdentityNullifier} `);

    // identity commitment
    const commitment = await generateCommitment(zkIdentitySecret, zkIdentityNullifier);
    
    console.log(`Identity commitment (BigInt): ${commitment}`);
}

main().catch(error => {
    console.error("An error occured:", error);
    process.exit(1);
})

