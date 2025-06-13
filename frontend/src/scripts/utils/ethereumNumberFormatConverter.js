import { ethers } from "ethers";

/**
 * A utility class for converting between different number formats commonly used in Ethereum:
 * - Decimal strings (e.g., "123456789") - Human-readable numbers as text
 * - BigInt (e.g., 123456789n) - JavaScript's native big integer type
 * - bytes32 hex strings (e.g., "0x0000...075bcd15") - Ethereum's 32-byte hex format
 *
 * @class EthereumNumberFormatConverter
 */
class EthereumNumberFormatConverter {
  /**
   * Converts a decimal string (e.g., "123456789") to a bytes32 hex string.
   * A decimal string is a number represented as text using digits 0-9.
   * This is the most common conversion needed when preparing numbers for Ethereum smart contracts.
   *
   * @param {string} decimalString - The decimal string to convert (e.g., "123456789")
   * @returns {string} The bytes32 hex string representation (0x-prefixed)
   * @throws {Error} If the input is not a valid decimal string (contains non-digit characters)
   *
   * @example
   * // Convert the decimal string "123456789" to bytes32
   * const bytes32Hex = EthereumNumberFormatConverter.decimalToBytes32("123456789");
   * // Returns: "0x00000000000000000000000000000000000000000000000000000000075bcd15"
   */
  static decimalToBytes32(decimalString) {
    // 1. Convert the decimal string to a JavaScript BigInt
    const bigIntValue = BigInt(decimalString);
    console.log("1. BigInt Value:", bigIntValue);

    // 2. Convert BigInt to hexadecimal string and pad to 32 bytes (64 chars)
    const bytes32Hex = ethers.zeroPadValue(ethers.toBeHex(bigIntValue), 32);
    console.log("2. Formatted for bytes32 (Ethers.js):", bytes32Hex);

    return bytes32Hex;
  }

  /**
   * Converts a bytes32 hex string to its BigInt representation.
   * This is useful when processing numbers returned from Ethereum smart contracts.
   *
   * @param {string} bytes32Hex - The bytes32 hex string (with or without 0x prefix)
   * @returns {bigint} The BigInt representation
   * @throws {Error} If the input is not a valid hex string
   *
   * @example
   * const bigInt = EthereumNumberFormatConverter.bytes32ToBigInt("0x00000000000000000000000000000000000000000000000000000000075bcd15");
   * // Returns: 123456789n
   */
  static bytes32ToBigInt(bytes32Hex) {
    // Remove '0x' prefix if present
    const hexString = bytes32Hex.startsWith("0x")
      ? bytes32Hex.slice(2)
      : bytes32Hex;

    // Convert hex to BigInt
    const bigIntValue = BigInt("0x" + hexString);
    console.log("Converted back to BigInt:", bigIntValue);

    return bigIntValue;
  }

  /**
   * Converts a BigInt to a bytes32 hex string, padding to exactly 32 bytes.
   * This is useful when you already have a BigInt value and need to format it for Ethereum.
   *
   * @param {bigint} bigIntValue - The BigInt value to convert
   * @returns {string} The bytes32 hex string representation (0x-prefixed)
   *
   * @example
   * const bytes32Hex = EthereumNumberFormatConverter.bigIntToBytes32(123456789n);
   * // Returns: "0x00000000000000000000000000000000000000000000000000000000075bcd15"
   */
  static bigIntToBytes32(bigIntValue) {
    const bytes32Hex = ethers.zeroPadValue(ethers.toBeHex(bigIntValue), 32);
    console.log("Converted BigInt to bytes32:", bytes32Hex);
    return bytes32Hex;
  }
}

// Test all functions
const testInput =
  "2816585570619196139655348047484435893091094801877254464923708610492590781282";
console.log("\nTesting decimalToBytes32 with input:", testInput);
const result = EthereumNumberFormatConverter.decimalToBytes32(testInput);
console.log("Final result:", result);

// Test converting back
console.log("\nTesting bytes32ToBigInt with the previous result");
const backToBigInt = EthereumNumberFormatConverter.bytes32ToBigInt(result);
console.log("Original input:", testInput);
console.log("Converted back:", backToBigInt.toString());
console.log("Are they equal?", BigInt(testInput) === backToBigInt);

// Test direct BigInt conversion
console.log("\nTesting bigIntToBytes32 with BigInt input");
const directBytes32 =
  EthereumNumberFormatConverter.bigIntToBytes32(backToBigInt);
console.log("Direct conversion result:", directBytes32);
console.log("Are the hex strings equal?", result === directBytes32);
