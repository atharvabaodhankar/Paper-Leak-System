import { useEffect, useRef, useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook that automatically logs in when MetaMask account changes
 */
export const useAutoLogin = () => {
  const { account, isConnected } = useWeb3();
  const { loginWithWallet, isAuthenticated, user } = useAuth();
  const previousAccount = useRef(null);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    const handleAccountChange = async () => {
      // Skip if no account or already logging in
      if (!account || !isConnected || isAutoLoggingIn) {
        return;
      }

      // Skip if this is the same account
      if (previousAccount.current === account) {
        return;
      }

      // Skip if user is already authenticated with this account
      if (isAuthenticated && user?.walletAddress === account) {
        previousAccount.current = account;
        return;
      }

      console.log('🔄 Account changed, auto-logging in with:', account);
      
      try {
        setIsAutoLoggingIn(true);
        const result = await loginWithWallet(account);
        
        if (result.success) {
          console.log('✅ Auto-login successful');
          previousAccount.current = account;
        } else {
          console.error('❌ Auto-login failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Auto-login error:', error);
      } finally {
        setIsAutoLoggingIn(false);
      }
    };

    handleAccountChange();
  }, [account, isConnected, loginWithWallet, isAuthenticated, user, isAutoLoggingIn]);

  // Update previous account when user manually logs out
  useEffect(() => {
    if (!isAuthenticated) {
      previousAccount.current = null;
    }
  }, [isAuthenticated]);

  return {
    isAutoLoggingIn
  };
};