import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import deployments from '../deployments.json';

// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  account: string | null;
  contract: Contract | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  showWalletModal: boolean;
  setShowWalletModal: (show: boolean) => void;
}

const LEMON_MINER_ABI = [
  "function startGame() external payable",
  "function completeGame(bool won, uint256 earnings) external",
  "function withdraw() external",
  "function getPlayerStats(address player) external view returns (tuple(uint256 totalGames, uint256 totalWins, uint256 totalLosses, uint256 totalEarnings))",
  "function getPlayerBalance(address player) external view returns (uint256)",
  "function getPlayerDeposit(address player) external view returns (uint256)",
  "event GameStarted(address indexed player, uint256 betAmount)",
  "event GameCompleted(address indexed player, bool won, uint256 earnings)",
  "event Withdrawn(address indexed player, uint256 amount)"
] as const;

// Initialize WalletKit
const core = new Core({
  projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || "YOUR_PROJECT_ID"
});

let walletKitInstance: any;

export const Web3Context = createContext<Web3ContextType>({
  account: null,
  contract: null,
  provider: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
  showWalletModal: false,
  setShowWalletModal: () => {}
});

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const initWeb3 = async (provider: BrowserProvider) => {
    try {
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const lemonMinerContract = new Contract(
          deployments.LemonMiner.address,
          LEMON_MINER_ABI,
          signer
        );
        setAccount(accounts[0]);
        setContract(lemonMinerContract);
        setProvider(provider);
      }
    } catch (error) {
      console.error("Failed to initialize web3:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum as any);
          await initWeb3(provider);
        }
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
      }
    };
    init();
  }, []);

  const handleConnect = async () => {
    if (!window.ethereum) {
      setShowWalletModal(true);
      return;
    }
    await connectWithMetaMask();
  };

  const connectWithMetaMask = async () => {
    try {
      setIsConnecting(true);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new BrowserProvider(window.ethereum as any);
      await initWeb3(provider);
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to connect with MetaMask:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWithWalletConnect = async () => {
    try {
      setIsConnecting(true);
      // Initialize WalletConnect
      walletKitInstance = await Web3Wallet.init({
        core,
        metadata: {
          name: 'Lemon Miner',
          description: 'A fun mining game',
          url: window.location.origin,
          icons: ['https://your-icon-url.com']
        }
      });

      // Connect
      const session = await walletKitInstance.connect({
        requiredNamespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'eth_sign'],
            chains: ['eip155:1'],
            events: ['chainChanged', 'accountsChanged']
          }
        }
      });

      if (session) {
        const provider = new BrowserProvider(window.ethereum as any);
        await initWeb3(provider);
        setShowWalletModal(false);
      }
    } catch (error) {
      console.error('Failed to connect with WalletConnect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear all states first
      setAccount(null);
      setContract(null);
      setProvider(null);
      setShowWalletModal(false);
      
      // Clear any stored wallet connection
      if (window.localStorage) {
        window.localStorage.removeItem('walletconnect');
        window.localStorage.removeItem('wagmi.wallet');
        window.localStorage.removeItem('wagmi.connected');
        window.localStorage.removeItem('metamask.connected');
      }
      
      // Disconnect from MetaMask
      if (window.ethereum) {
        try {
          // Remove all listeners
          window.ethereum.removeAllListeners();
          
          // Request account disconnection
          await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }]
          });
          
          // Clear any cached accounts
          await window.ethereum.request({
            method: "eth_accounts",
            params: []
          });
          
          // Remove the ethereum provider
          delete window.ethereum;
        } catch (e) {
          console.error("Error disconnecting from MetaMask:", e);
        }
      }
      
      // Force a clean reload
      window.location.href = window.location.origin + window.location.pathname;
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  return (
    <Web3Context.Provider value={{
      account,
      contract,
      provider,
      isConnecting,
      connect: handleConnect,
      disconnect: handleDisconnect,
      showWalletModal,
      setShowWalletModal
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const Web3ReactProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Web3Provider>{children}</Web3Provider>;
};