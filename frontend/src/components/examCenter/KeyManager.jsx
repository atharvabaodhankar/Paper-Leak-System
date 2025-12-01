import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { generateKeyPair } from '../../utils/crypto';

const KeyManager = ({ onRegisterSuccess }) => {
  const { account, contract } = useWeb3();
  const [hasKey, setHasKey] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem(`chainseal_priv_${account}`);
    if (savedKey) {
      setHasKey(true);
    }
    
    const checkOnChain = async () => {
      if (contract && account) {
        const pk = await contract.getExamCenterPublicKey(account);
        if (pk && pk !== '0x') {
          setStatus('Account registered on blockchain');
        }
      }
    };
    checkOnChain();
  }, [account, contract]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setStatus('Generating RSA-2048 Keypair...');
      
      const { publicKey, privateKey } = await generateKeyPair();
      
      localStorage.setItem(`chainseal_priv_${account}`, privateKey);
      localStorage.setItem(`chainseal_pub_${account}`, publicKey);
      
      setPublicKey(publicKey);
      setHasKey(true);
      setStatus('Keypair generated successfully!');
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!contract || !publicKey) return;
    try {
      setLoading(true);
      setStatus('Registering public key on blockchain...');
      
      const pkBytes = new TextEncoder().encode(publicKey);
      const tx = await contract.registerExamCenter(pkBytes);
      
      setStatus('Waiting for confirmation...');
      await tx.wait();
      
      setStatus('Success! Exam Center Registered.');
      if (onRegisterSuccess) onRegisterSuccess();
    } catch (error) {
      console.error(error);
      setStatus(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        🔑 Key Management
      </h3>
      
      <div className="space-y-4">
        {!hasKey ? (
          <div>
            <p className="text-sm text-[hsl(var(--color-text-secondary))] mb-4">
              To receive encrypted papers, you need to generate a secure RSA keypair. 
              The private key will stay on your device.
            </p>
            <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full">
              {loading ? 'Generating...' : 'Generate New Keypair'}
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-success/10 border border-success/20 p-3 rounded-lg mb-4">
              <p className="text-xs text-success font-medium flex items-center gap-2">
                ✅ Secure Keypair Found Locally
              </p>
            </div>
            
            <p className="text-xs text-[10px] text-[hsl(var(--color-text-muted))] mb-4 break-all font-mono">
              Local Storage ID: chainseal_priv_{account.slice(0,8)}...
            </p>

            <button onClick={handleRegister} disabled={loading} className="btn-outline w-full py-2">
              {loading ? 'Processing...' : 'Register/Update On-Chain'}
            </button>
          </div>
        )}
        
        {status && (
          <p className="text-[10px] text-center mt-2 opacity-70 italic">{status}</p>
        )}
      </div>
    </div>
  );
};

export default KeyManager;
