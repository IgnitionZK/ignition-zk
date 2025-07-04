import { useState, useEffect, useCallback } from "react";
import { useWalletQuery } from "./useWalletQuery";
import { ethers } from "ethers";

// ERC721 ABI for balanceOf function
const ERC721_ABI = ["function balanceOf(address owner) view returns (uint256)"];

/**
 * A React hook that checks if the connected wallet owns any tokens from a specified ERC721 contract.
 *
 * @param {string} contractAddress - The address of the ERC721 contract to check ownership against
 * @param {boolean} enabled - Whether to automatically check ownership (default: true)
 * @returns {Object} An object containing ownership status and related information
 * @property {boolean} isOwner - Whether the connected wallet owns any tokens from the contract
 * @property {boolean} isChecking - Whether the ownership check is currently in progress
 * @property {string|null} error - Any error message that occurred during the check, null if no error
 * @property {Function} checkOwnership - Function to manually trigger an ownership check
 *
 * @example
 * const { isOwner, isChecking, error, checkOwnership } = useERC721Ownership("0x123...", true);
 */
export function useERC721Ownership(contractAddress, enabled = true) {
  const { provider, address, isLoading: isWalletLoading } = useWalletQuery();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const checkOwnership = useCallback(async () => {
    if (!provider || !address || !contractAddress) {
      setError("Provider, address, and contract address are required");
      return false;
    }

    try {
      setIsChecking(true);
      setError(null);

      const contract = new ethers.Contract(
        contractAddress,
        ERC721_ABI,
        provider
      );

      const balance = await contract.balanceOf(address);
      setIsOwner(balance > 0);
      return balance > 0;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [provider, address, contractAddress]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const checkWithDebounce = async () => {
      // Only run if enabled and we have the required data
      if (!enabled || !contractAddress || !address || isWalletLoading) return;

      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set a new timeout
      timeoutId = setTimeout(async () => {
        if (isMounted) {
          await checkOwnership();
        }
      }, 300); // 300ms debounce
    };

    checkWithDebounce();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [checkOwnership, contractAddress, address, isWalletLoading, enabled]);

  return {
    isOwner,
    isChecking: isChecking || isWalletLoading,
    error,
    checkOwnership,
  };
}
