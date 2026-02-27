import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, USDC_ADDRESS, USDC_ABI, RPC_URL, SEPOLIA_CHAIN_ID } from '../lib/constants';

declare global {
  interface Window {
    ethereum: any;
  }
}

interface Web3ContextType {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  contract: ethers.Contract | null;
  usdcContract: ethers.Contract | null;
  walletAddress: string | null;
  isOwner: boolean;
  connectWallet: () => Promise<void>;
  readContract: ethers.Contract | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [usdcContract, setUsdcContract] = useState<ethers.Contract | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [readContract, setReadContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    // Initialize read-only contract
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
      setReadContract(readOnlyContract);
    } catch (e) {
      console.error("Init read contract error:", e);
    }

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => window.location.reload());
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask tidak ditemukan. Install MetaMask terlebih dahulu.");
      return;
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      let web3Provider = new ethers.providers.Web3Provider(window.ethereum);

      const network = await web3Provider.getNetwork();
      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (sw: any) {
          if (sw.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }]
            });
          } else {
            return;
          }
        }
        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      }

      const web3Signer = web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const web3Contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
      const web3UsdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, web3Signer);

      let ownerAddr = "";
      try {
        ownerAddr = await web3Contract.owner();
      } catch (e) {
        console.error("Error fetching owner", e);
      }

      setProvider(web3Provider);
      setSigner(web3Signer);
      setWalletAddress(address);
      setContract(web3Contract);
      setUsdcContract(web3UsdcContract);
      setIsOwner(ownerAddr.toLowerCase() === address.toLowerCase());

    } catch (e: any) {
      console.error(e);
      alert("Gagal connect wallet: " + (e.message || e));
    }
  };

  return (
    <Web3Context.Provider value={{
      provider, signer, contract, usdcContract, walletAddress, isOwner, connectWallet, readContract
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
