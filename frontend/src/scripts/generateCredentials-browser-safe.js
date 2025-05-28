import * as bip39 from "bip39";
import * as circomlibjs from "circomlibjs";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { Buffer } from "buffer";
// import { ethers } from "ethers";

export class ZkCredential {
  static #ENC = new TextEncoder();
  static #FIELD_PRIME =
    21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  static #APP_SALT = ZkCredential.#ENC.encode("IgnitionZK_salt_v1");
  static #ZK_SECRET_INFO = ZkCredential.#ENC.encode("ZK_IDENTITY_SECRET");
  static #ZK_NULLIFIER_INFO = ZkCredential.#ENC.encode("ZK_IDENTITY_NULLIFIER");
  static #DERIVED_KEY_BYTE_LENGTH = 32;
  static #ENTROPY_BITS = 128;
  static #poseidonInstance;

  static #bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  static async #tagToField(tag) {
    const data = ZkCredential.#ENC.encode(tag);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return BigInt("0x" + this.#bytesToHex(buf)) % this.#FIELD_PRIME;
  }

  static #performModularReduction(rawBigInt) {
    return (
      ((rawBigInt % this.#FIELD_PRIME) + this.#FIELD_PRIME) % this.#FIELD_PRIME
    );
  }

  static async #getPoseidon() {
    if (!this.#poseidonInstance) {
      this.#poseidonInstance = await circomlibjs.buildPoseidon();
    }
    return this.#poseidonInstance;
  }

  static generateMnemonicSeed(bits = this.#ENTROPY_BITS) {
    if (bits < 128) {
      throw new Error(
        "At least 128 bits of entropy are recommended for zk-identity use."
      );
    }

    // create mnemonic and seed
    const mnemonic = bip39.generateMnemonic(bits);
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    return { seed, mnemonic };
  }

  static generateKeys(ikm) {
    // ikm must be Uint8Array; if you have Buffer, do: new Uint8Array(ikm)
    const trapdoorBytes = hkdf(
      sha256,
      ikm,
      this.#APP_SALT,
      this.#ZK_SECRET_INFO,
      this.#DERIVED_KEY_BYTE_LENGTH
    );
    const nullifierBytes = hkdf(
      sha256,
      ikm,
      this.#APP_SALT,
      this.#ZK_NULLIFIER_INFO,
      this.#DERIVED_KEY_BYTE_LENGTH
    );

    const trapdoor = this.#performModularReduction(
      BigInt("0x" + this.#bytesToHex(trapdoorBytes))
    );
    const nullifier = this.#performModularReduction(
      BigInt("0x" + this.#bytesToHex(nullifierBytes))
    );
    return { trapdoorKey: trapdoor, nullifierKey: nullifier };
  }

  static async generateCredentials(bits = this.#ENTROPY_BITS) {
    const { seed, mnemonic } = this.generateMnemonicSeed(bits);
    const { trapdoorKey, nullifierKey } = this.generateKeys(seed);
    const poseidon = await this.#getPoseidon();
    const F = poseidon.F;

    const trapdoorTag = await this.#tagToField("zk-trapdoor");
    const nullifierTag = await this.#tagToField("zk-nullifier");

    const trapdoor = F.toObject(poseidon([trapdoorTag, trapdoorKey]));
    const nullifier = F.toObject(poseidon([nullifierTag, nullifierKey]));
    const commitment = F.toObject(poseidon([nullifier, trapdoor]));

    return { identity: { trapdoor, nullifier }, commitment, mnemonic };
  }
}
