import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserProvider } from "ethers";
import { useEffect } from "react";

const WALLET_QUERY_KEY = "wallet";

/**
 * Retrieves the current wallet state including provider, signer, and address.
 * @async
 * @function getWalletState
 * @returns {Promise<{provider: BrowserProvider, signer: Signer, address: string} | null>} The wallet state object containing provider, signer, and address, or null if wallet is not available
 */
async function getWalletState() {
  if (!window.ethereum) return null;

  // Only try to get wallet state if there's already a selected account
  if (!window.ethereum.selectedAddress) return null;

  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return {
      provider,
      signer,
      address,
    };
  } catch (error) {
    return null;
  }
}

/**
 * A React hook that provides wallet connection functionality and wallet state.
 * @function useWalletQuery
 * @returns {Object} An object containing wallet connection utilities and state
 * @property {Function} connect - Function to connect the wallet
 * @property {string|null} address - The connected wallet address
 * @property {BrowserProvider|null} provider - The ethers.js provider instance
 * @property {Signer|null} signer - The ethers.js signer instance
 * @property {boolean} isLoading - Loading state of the wallet query
 */
export function useWalletQuery() {
  const queryClient = useQueryClient();

  const { data: walletState, isLoading } = useQuery({
    queryKey: [WALLET_QUERY_KEY],
    queryFn: getWalletState,
    staleTime: Infinity, // Keep the data fresh indefinitely
    cacheTime: Infinity, // Keep the data in cache indefinitely
  });

  const connect = async () => {
    if (!window.ethereum) return alert("MetaMask not found");

    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // Refetch the wallet state after connecting
      await queryClient.invalidateQueries([WALLET_QUERY_KEY]);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Set up event listeners for wallet changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = () => {
      queryClient.invalidateQueries([WALLET_QUERY_KEY]);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [queryClient]);

  return {
    connect,
    address: walletState?.address,
    provider: walletState?.provider,
    signer: walletState?.signer,
    isLoading,
  };
}
