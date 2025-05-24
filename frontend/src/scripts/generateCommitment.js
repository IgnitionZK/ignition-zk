// bip39 provides functionality for creating mnemonics
import * as bip39 from "bip39";

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
  const mnemonic = bip39.generateMnemonic(bits);
  console.log("Mnemonic: ", mnemonic);
  const seed = bip39.mnemonicToSeedSync(mnemonic);

  // Securely slice and copy
  const seedCopy = Uint8Array.prototype.slice.call(seed, 0, 32);
  const secretSeed = BigInt("0x" + Buffer.from(seedCopy).toString("hex"));
  console.log("Secret Seed: ", secretSeed);
  return secretSeed;
}

generateSeed();
