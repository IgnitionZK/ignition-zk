import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const connect = async () => {
    if (!window.ethereum) return alert("MetaMask not found");
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    setProvider(provider);
    setSigner(signer);
    setAddress(address);
  };

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      connect();
    }
  }, []);

  return { connect, address, provider, signer };
}
