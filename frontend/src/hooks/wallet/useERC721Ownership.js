import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./useWallet";
import { ethers } from "ethers";

// ERC721 ABI for balanceOf function
const ERC721_ABI = ["function balanceOf(address owner) view returns (uint256)"];

export function useERC721Ownership(contractAddress) {
  const { provider, address } = useWallet();
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
      if (!contractAddress || !address) return;

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
  }, [checkOwnership, contractAddress, address]);

  return {
    isOwner,
    isChecking,
    error,
    checkOwnership,
  };
}
