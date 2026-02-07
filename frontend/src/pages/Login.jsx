import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldAlert, Wallet, Lock, Activity } from 'lucide-react';

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

  // Auto-login handled globally by useAutoLogin hook in App.jsx
  // Removed local useEffect to prevent double login attempts

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
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-lg mx-auto p-4">
      {/* Login Card */}
      <Card className="w-full border-slate-800 bg-slate-900/60">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto mb-4">
            <img 
              src="/logo.png" 
              alt="ZeroLeak Secure Access" 
              className="w-20 h-20 object-contain mx-auto drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]"
            />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            Access Control
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Authenticate using your secure wallet identity
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {!isConnected ? (
            <div className="space-y-4">
              <Button 
                onClick={handleConnectWallet} 
                disabled={loading} 
                className="w-full py-6 text-lg"
                size="lg"
              >
                {loading ? 'Connecting...' : (
                  <>
                    <Wallet className="mr-2 h-5 w-5" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            </div>
          ) : (
             <div className="space-y-5">
                <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Verified Identity</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-emerald-400 font-medium">
                      {account?.slice(0, 8)}...{account?.slice(-6)}
                    </p>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                      CONNECTED
                    </Badge>
                  </div>
                </div>

                {!isOnSepolia ? (
                  <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-lg space-y-3">
                    <p className="text-amber-200 text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Network Mismatch
                    </p>
                    <Button
                      onClick={switchToSepolia}
                      variant="outline"
                      className="w-full border-amber-700 hover:bg-amber-950 text-amber-500"
                    >
                      Switch to Sepolia
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center text-emerald-500 py-2">
                    <span className="relative flex h-2.5 w-2.5 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium">Secure Connection Established</span>
                  </div>
                )}

                {loading && (
                   <Button disabled className="w-full" variant="ghost">
                     <span className="animate-pulse">Verifying Credentials...</span>
                   </Button>
                )}
              </div>
          )}
        </CardContent>
        
        <CardFooter className="flex-col gap-4 border-t border-slate-800 pt-6">
           <div className="text-center space-y-2">
             <p className="text-xs text-slate-500">
                Authorized Personnel Only. All actions are logged on-chain.
             </p>
           </div>
           
           <div className="text-center pt-2">
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Get MetaMask Wallet
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
