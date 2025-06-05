import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

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

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
  };

  useEffect(() => {
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
