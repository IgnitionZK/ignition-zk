// imports
import * as bip39 from "bip39";
import * as circomlibjs from "circomlibjs";

/**
 * @title Generate Seed
 * @notice Generates a cryptographically secure seed value from a BIP39 mnemonic
 * @dev Uses bip39 library to generate mnemonic and seed, then reduces it to BN254's finite field
 * @param {number} bits - The number of bits of entropy for mnemonic generation (default: 128)
 * @return {bigint} The generated seed value reduced to BN254's finite field
 * @example
 * // Generate a seed from a 12-word mnemonic (128 bits)
 * const seed = generateSeed();
 * // Generate a seed from a 24-word mnemonic (256 bits)
 * const seed = generateSeed(256);
 */
export function generateMnemonicSeed(bits = 128) {
  // create 12-word mnemonic and seed
  const mnemonic = bip39.generateMnemonic(bits);
  const seed = bip39.mnemonicToSeedSync(mnemonic);

  // Securely slice and copy
  const seedSlice = Uint8Array.prototype.slice.call(seed, 0, 32);
  const rawBigInt = BigInt("0x" + Buffer.from(seedSlice).toString("hex"));

  // Reduce the input into the BN254's finite field
  const FIELD_PRIME =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const secretSeed = ((rawBigInt % FIELD_PRIME) + FIELD_PRIME) % FIELD_PRIME;

  return { secretSeed, mnemonic };
}

const { secretSeed, mnemonic } = generateMnemonicSeed();

let poseidonInstance;

/**
 * @title Get Poseidon Instance
 * @notice Returns a singleton instance of the Poseidon hash function
 * @dev Uses memoization to cache the Poseidon instance for better performance
 * @return {Promise<Object>} The Poseidon hash function instance with its field operations
 */
async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await circomlibjs.buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * @title Generate Credentials
 * @notice Generates complete credentials with trapdoor, nullifier, and commitment
 * @dev Uses Poseidon hash function from circomlibjs to generate cryptographically secure identity components
 * @param {bigint} seed - The secret seed to generate the identity from
 * @return {Object} Object containing:
 *   - trapdoor: The trapdoor value generated from seed
 *   - nullifier: The nullifier value generated from seed
 *   - commitment: The final commitment hash of nullifier and trapdoor
 */

export async function generateCredentials(secretSeed) {
  if (typeof secretSeed !== "bigint") {
    throw new Error("Seed must be a bigint");
  }

  const poseidon = await getPoseidon();
  const F = poseidon.F;

  const trapdoor = F.toObject(poseidon([1n, secretSeed]));
  const nullifier = F.toObject(poseidon([2n, secretSeed]));
  const commitment = F.toObject(poseidon([nullifier, trapdoor]));

  return {
    identity: {
      trapdoor,
      nullifier,
    },
    commitment,
  };
}

(async () => {
  const { identity, commitment } = await generateCredentials(secretSeed);
  console.log({ identity, commitment, mnemonic });
})();
