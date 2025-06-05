import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

/**
 * A React custom hook for managing Ethereum wallet connections using MetaMask.
 * Provides functionality to connect, disconnect, and track wallet state.
 *
 * @returns {Object} An object containing wallet state and connection functions
 * @property {Function} connect - Function to connect to MetaMask wallet
 * @property {string|null} address - The connected wallet address, or null if not connected
 * @property {BrowserProvider|null} provider - The ethers.js provider instance, or null if not connected
 * @property {Signer|null} signer - The ethers.js signer instance, or null if not connected
 */
export function useWallet() {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  /**
   * Connects to the user's MetaMask wallet.
   * Requests account access and initializes the provider and signer.
   * @returns {Promise<void>}
   */
  const connect = async () => {
    if (!window.ethereum) return alert("MetaMask not found");
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
    } catch {
      disconnect();
    }
  };

  /**
   * Disconnects from the current wallet by clearing all wallet-related state.
   */
  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
  };

  useEffect(() => {
    /**
     * Checks if there's an existing wallet connection on component mount.
     * If found, initializes the provider and signer with the connected account.
     */
    const checkInitialConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();

          setProvider(provider);
          setSigner(signer);
          setAddress(address);
        } catch {
          disconnect();
        }
      }
    };

    if (window.ethereum) {
      checkInitialConnection();

      window.ethereum.removeAllListeners();

      window.ethereum.on("accountsChanged", async (accounts) => {
        if (!accounts || accounts.length === 0) {
          disconnect();
        } else {
          try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();

            setProvider(provider);
            setSigner(signer);
            setAddress(address);
          } catch {
            disconnect();
          }
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      return () => {
        if (window.ethereum) {
          window.ethereum.removeAllListeners();
        }
      };
    }
  }, []);

  return { connect, address, provider, signer };
}
