// These credentials are intended for use in zero-knowledge identity systems
// Poseidon inputs are domain-separated to prevent collisions across identity layers

// imports
import * as bip39 from "bip39";
import * as circomlibjs from "circomlibjs";
import hkdf from "futoin-hkdf";
import crypto from "crypto";

/**
 * @title ZkIdentity
 * @notice A class for generating and managing zero-knowledge identity credentials
 * @dev Uses BIP39 for mnemonic generation, HKDF for key derivation, and Poseidon for hashing
 */
export class ZkCredential {
  // Class-level state
  static #poseidonInstance;
  static #FIELD_PRIME =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;

  /**
   * @title Convert Tag to Field Element
   * @notice Converts a string tag into a field element for use in Poseidon hashing
   * @dev Uses SHA-256 to hash the tag and reduces it modulo the field prime
   * @param {string} tag - The string tag to convert (e.g., "zk-trapdoor", "zk-nullifier")
   * @return {bigint} The tag converted to a field element in BN254's finite field
   * @private
   */
  static #tagToField(tag) {
    const hash = crypto.createHash("sha256").update(tag).digest("hex");
    return BigInt("0x" + hash) % this.#FIELD_PRIME;
  }

  /**
   * @title Get Poseidon Instance
   * @notice Returns a singleton instance of the Poseidon hash function
   * @dev Uses memoization to cache the Poseidon instance for better performance
   * @return {Promise<Object>} The Poseidon hash function instance with its field operations
   * @private
   */
  static async #getPoseidon() {
    if (!this.#poseidonInstance) {
      this.#poseidonInstance = await circomlibjs.buildPoseidon();
    }
    return this.#poseidonInstance;
  }

  /**
   * @title Generate Mnemonic Seed
   * @notice Generates a cryptographically secure seed value from a BIP39 mnemonic
   * @dev Uses bip39 library to generate mnemonic and seed, then reduces it to BN254's finite field
   * @param {number} bits - The number of bits of entropy for mnemonic generation (default: 256)
   * @return {{ secretSeed: bigint, mnemonic: string }} The generated seed value reduced to BN254's finite field
   * @throws {Error} If bits is less than 256
   */
  static generateMnemonicSeed(bits = 256) {
    if (bits < 256) {
      throw new Error(
        "At least 256 bits of entropy are recommended for zk-identity use."
      );
    }

    // create mnemonic and seed
    const mnemonic = bip39.generateMnemonic(bits);
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // Securely slice and copy
    const derivedKey = hkdf(seed, 32, { hash: "SHA-256", info: "zk-identity" });
    const rawBigInt = BigInt("0x" + Buffer.from(derivedKey).toString("hex"));

    // Reduce the input into the BN254's finite field
    const secretSeed =
      ((rawBigInt % this.#FIELD_PRIME) + this.#FIELD_PRIME) % this.#FIELD_PRIME;

    return { secretSeed, mnemonic };
  }

  /**
   * @title Generate Credentials
   * @notice Generates complete credentials with trapdoor, nullifier, and commitment
   * @dev Uses Poseidon hash function from circomlibjs to generate cryptographically secure identity components
   * @param {bigint} secretSeed - The secret seed to generate the identity from
   * @return {Promise<Object>} Object containing:
   *   - identity: Object containing trapdoor and nullifier
   *   - commitment: The final commitment hash of nullifier and trapdoor
   * @throws {Error} If secretSeed is not a bigint
   */
  static async generateCredentials(secretSeed) {
    if (typeof secretSeed !== "bigint") {
      throw new Error("Seed must be a bigint");
    }

    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;

    //using hashed tags (like "zk-trapdoor", "zk-nullifier") provides semantic separation that's harder to mix up or collide
    const trapdoorTag = this.#tagToField("zk-trapdoor");
    const nullifierTag = this.#tagToField("zk-nullifier");

    const trapdoor = F.toObject(poseidon([trapdoorTag, secretSeed]));
    const nullifier = F.toObject(poseidon([nullifierTag, secretSeed]));
    const commitment = F.toObject(poseidon([nullifier, trapdoor]));

    return {
      identity: {
        trapdoor,
        nullifier,
      },
      commitment,
    };
  }
}

// Example usage
const { secretSeed, mnemonic } = ZkCredential.generateMnemonicSeed();
(async () => {
  const { identity, commitment } = await ZkCredential.generateCredentials(
    secretSeed
  );
  console.log({ identity, commitment, mnemonic });
})();
