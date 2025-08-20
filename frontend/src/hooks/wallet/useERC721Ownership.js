import { useState, useEffect, useCallback } from "react";
import { useWalletQuery } from "./useWalletQuery";
import { ethers } from "ethers";

// ERC721 ABI for balanceOf function
const ERC721_ABI = ["function balanceOf(address owner) view returns (uint256)"];

/**
 * A React hook that checks if the connected wallet owns any tokens from a specified ERC721 contract.
 *
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
      if (!enabled || !contractAddress || !address || isWalletLoading) return;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        if (isMounted) {
          await checkOwnership();
        }
      }, 300);
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
