import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, account, isConnected, loading: web3Loading, isOnSepolia, switchToSepolia } = useWeb3();
  const { loginWithWallet, loading: authLoading, isAuthenticated } = useAuth();
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Auto-login when wallet connects
  useEffect(() => {
    if (account && isConnected) {
      handleLogin();
    }
  }, [account, isConnected]);

  const handleConnectWallet = async () => {
    setError('');
    const walletAddress = await connectWallet();
    
    if (!walletAddress) {
      setError('Failed to connect wallet');
    }
  };

  const handleLogin = async () => {
    if (!account) return;

    setError('');

    // Check if on Sepolia
    if (!isOnSepolia) {
      setError('Please switch to Sepolia network');
      await switchToSepolia();
      return;
    }

    const result = await loginWithWallet(account);

    if (result.success) {
      if (result.isProfileComplete) {
        navigate('/dashboard');
      } else {
        navigate('/complete-profile');
      }
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const loading = web3Loading || authLoading;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          {/* Logo/Title */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-gradient mb-4">ZeroLeak</h1>
            <p className="text-[hsl(var(--color-text-secondary))] text-lg">
              Secure Exam Paper Management
            </p>
          </div>

          {/* Login Card */}
          <div className="glass-card p-8 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6 text-center">Connect Your Wallet</h2>

            {error && (
              <div className="mb-6 p-4 bg-[hsl(var(--color-danger))]/20 border border-[hsl(var(--color-danger))]/30 rounded-lg">
                <p className="text-[hsl(var(--color-danger))] text-sm">{error}</p>
              </div>
            )}

            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
                      <path d="M32.5 8.75L24.375 2.5L16.25 8.75L8.125 2.5L0 8.75V31.25L8.125 37.5L16.25 31.25L24.375 37.5L32.5 31.25L40 37.5V15L32.5 8.75Z" fill="currentColor"/>
                    </svg>
                    <span>Connect MetaMask</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[hsl(var(--color-bg-tertiary))] rounded-lg">
                  <p className="text-sm text-[hsl(var(--color-text-muted))] mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-[hsl(var(--color-text-primary))]">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </p>
                </div>

                {!isOnSepolia && (
                  <div className="p-4 bg-[hsl(var(--color-warning))]/20 border border-[hsl(var(--color-warning))]/30 rounded-lg">
                    <p className="text-[hsl(var(--color-warning))] text-sm mb-3">
                      ⚠️ Please switch to Sepolia network
                    </p>
                    <button
                      onClick={switchToSepolia}
                      className="btn-outline w-full text-sm"
                    >
                      Switch to Sepolia
                    </button>
                  </div>
                )}

                {isOnSepolia && (
                  <div className="flex items-center gap-2 text-[hsl(var(--color-success))]">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-success))] animate-glow"></div>
                    <span className="text-sm">Connected to Sepolia</span>
                  </div>
                )}

                {loading && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-[hsl(var(--color-text-secondary))]">
                      <div className="w-4 h-4 border-2 border-[hsl(var(--color-primary))] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Signing message...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)]">
              <p className="text-sm text-[hsl(var(--color-text-muted))] text-center">
                🔒 Your wallet is your identity. No passwords needed.
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[hsl(var(--color-text-muted))]">
              Don't have MetaMask?{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--color-primary))] hover:underline"
              >
                Install it here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
