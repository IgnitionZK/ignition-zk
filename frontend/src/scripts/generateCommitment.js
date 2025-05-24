// imports
import * as bip39 from "bip39";
import * as circomlibjs from "circomlibjs";

/**
 * @title Generate seed
 * @notice Generates a BIP39 mnemonic phrase with specified entropy
 * @dev Uses bip39 library to generate cryptographically secure mnemonic phrases
 * @param {number} bits - The number of bits of entropy (default: 128)
 * @return {string} The generated mnemonic phrase
 * @example
 * // Generate a 12-word mnemonic (128 bits)
 * generateMnemonic()
 * // Generate a 24-word mnemonic (256 bits)
 * generateMnemonic(256)
 */
function generateSeed(bits = 128) {
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

  return secretSeed;
}

const seed1 = generateSeed();

async function generateIdentity(seed) {
  const poseidon = await circomlibjs.buildPoseidon();
  const F = poseidon.F;

  const trapdoor = F.toObject(poseidon([1n, seed]));
  const nullifier = F.toObject(poseidon([2n, seed]));
  const commitment = F.toObject(poseidon([nullifier, trapdoor]));

  return { trapdoor, nullifier, commitment };
}

(async () => {
  const commitment = await generateIdentity(seed1);
  console.log(commitment);
})();
