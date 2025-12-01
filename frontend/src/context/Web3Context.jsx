import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { EXAM_REGISTRY_ADDRESS, EXAM_REGISTRY_ABI } from '../constants/contracts';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);

  const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      alert('Please install MetaMask to use this application');
      return null;
    }

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();

      setProvider(provider);
      setAccount(accounts[0]);
      setChainId(`0x${network.chainId.toString(16)}`);
      setIsConnected(true);

      // Initialize contract
      const signer = provider.getSigner();
      const contractInstance = new ethers.Contract(
        EXAM_REGISTRY_ADDRESS,
        EXAM_REGISTRY_ABI,
        signer
      );
      setContract(contractInstance);

      // Auto-switch to Sepolia if not already on it
      if (`0x${network.chainId.toString(16)}` !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia();
      }

      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setProvider(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setContract(null);
  };

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    if (!isMetaMaskInstalled()) {
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      setChainId(SEPOLIA_CHAIN_ID);
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
          setChainId(SEPOLIA_CHAIN_ID);
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          alert('Failed to add Sepolia network');
        }
      } else {
        console.error('Error switching to Sepolia:', switchError);
      }
    }
  };

  // Sign message
  const signMessage = async (message) => {
    if (!provider || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const signer = provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        console.log('🔄 MetaMask account changed to:', accounts[0]);
        
        // Update account and reinitialize contract
        setAccount(accounts[0]);
        
        if (provider) {
          try {
            const signer = provider.getSigner();
            const contractInstance = new ethers.Contract(
              EXAM_REGISTRY_ADDRESS,
              EXAM_REGISTRY_ABI,
              signer
            );
            setContract(contractInstance);
            console.log('✅ Contract reinitialized for new account');
          } catch (error) {
            console.error('❌ Failed to reinitialize contract:', error);
          }
        }
      }
    };

    const handleChainChanged = (chainId) => {
      setChainId(chainId);
      // Reload page on chain change (recommended by MetaMask)
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          setProvider(provider);
          setAccount(accounts[0]);
          setChainId(`0x${network.chainId.toString(16)}`);
          setIsConnected(true);

          // Initialize contract
          const signer = provider.getSigner();
          const contractInstance = new ethers.Contract(
            EXAM_REGISTRY_ADDRESS,
            EXAM_REGISTRY_ABI,
            signer
          );
          setContract(contractInstance);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();
  }, []);

  const value = {
    account,
    chainId,
    provider,
    contract,
    isConnected,
    loading,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    signMessage,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    isOnSepolia: chainId === SEPOLIA_CHAIN_ID,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
