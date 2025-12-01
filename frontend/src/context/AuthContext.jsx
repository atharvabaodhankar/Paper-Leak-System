import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useWeb3 } from './Web3Context';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_URL = 'http://localhost:5000/api/auth';

// Configure axios to send cookies
axios.defaults.withCredentials = true;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { account, signMessage } = useWeb3();

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Load current user
  const loadUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/me`);
      setUser(response.data.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login with wallet
  const loginWithWallet = async (walletAddress) => {
    try {
      setLoading(true);

      // Step 1: Get nonce
      const nonceResponse = await axios.post(`${API_URL}/nonce`, {
        walletAddress,
      });

      const { nonce, message, isProfileComplete } = nonceResponse.data.data;

      // Step 2: Sign message
      const signature = await signMessage(message);

      // Step 3: Verify signature
      const verifyResponse = await axios.post(`${API_URL}/verify`, {
        walletAddress,
        signature,
      });

      const userData = verifyResponse.data.data.user;
      setUser(userData);
      setIsAuthenticated(true);

      return {
        success: true,
        isProfileComplete: userData.isProfileComplete,
      };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Failed to login';
      return {
        success: false,
        error: message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Complete profile
  const completeProfile = async (name, role) => {
    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/complete-profile`, {
        name,
        role,
      });

      const userData = response.data.data.user;
      setUser(userData);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Profile completion error:', error);
      const message = error.response?.data?.message || 'Failed to complete profile';
      return {
        success: false,
        error: message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    loginWithWallet,
    completeProfile,
    logout,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
