import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { reassemblePDF } from '../../utils/pdf/reassembler';
import { generateDeterministicKeyPair } from '../../utils/crypto';
import { ethers } from 'ethers';

const ExamCenterDashboard = () => {
  const { contract, account } = useWeb3();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState('Checking security keys...');
  const [downloadingId, setDownloadingId] = useState(null);
  const [status, setStatus] = useState('');
  const [centerName, setCenterName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to format time remaining
  const getTimeRemaining = (unlockTimestamp) => {
    const unlockTime = unlockTimestamp.toNumber() * 1000;
    const remaining = unlockTime - currentTime;
    
    if (remaining <= 0) return 'Ready to unlock!';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s remaining`;
    if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
    return `${seconds}s remaining`;
  };

  // Auto-generate keys and register center on mount/account change
  useEffect(() => {
    const checkAndGenerateKeys = async () => {
      if (!account || !contract) return;

      try {
        // Check if center is registered
        const centerInfo = await contract.centers(account);
        
        console.log('🔍 Center registration check:', {
          account,
          isRegistered: centerInfo.isRegistered,
          centerName: centerInfo.name,
          hasPublicKey: centerInfo.publicKey && centerInfo.publicKey !== '0x'
        });
        
        if (!centerInfo.isRegistered) {
          setKeyStatus('Initializing secure environment...');
          
          // Check if we already have keys in localStorage first
          const existingPrivKey = localStorage.getItem(`chainseal_priv_${account}`);
          const existingPubKey = localStorage.getItem(`chainseal_pub_${account}`);
          
          if (existingPrivKey && existingPubKey) {
            console.log('🔑 Using existing keys from localStorage for unregistered center');
            setKeyStatus('');
            setShowNamePrompt(true);
            return;
          }
          
          // Only generate new keys if we don't have them
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const message = `Generate ChainSeal encryption keys for Exam Center\nAccount: ${account}`;
          const signature = await signer.signMessage(message);
          
          const keys = await generateDeterministicKeyPair(signature);
          
          // Store keys in localStorage for later use
          localStorage.setItem(`chainseal_pub_${account}`, keys.publicKey);
          localStorage.setItem(`chainseal_priv_${account}`, keys.privateKey);
          
          console.log('🔑 Generated and stored encryption keys for exam center:', {
            account,
            publicKeyLength: keys.publicKey.length,
            privateKeyLength: keys.privateKey.length,
            publicKeyPreview: keys.publicKey.substring(0, 100) + '...'
          });
          
          setKeyStatus('');
          setShowNamePrompt(true);
        } else {
          // Center is registered, check if we have keys in localStorage
          const existingPrivKey = localStorage.getItem(`chainseal_priv_${account}`);
          const existingPubKey = localStorage.getItem(`chainseal_pub_${account}`);
          
          if (!existingPrivKey || !existingPubKey) {
            setKeyStatus('Regenerating security keys...');
            
            // Clear any existing keys first
            localStorage.removeItem(`chainseal_pub_${account}`);
            localStorage.removeItem(`chainseal_priv_${account}`);
            
            // Only request signature once for key regeneration
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const message = `Generate ChainSeal encryption keys for Exam Center\nAccount: ${account}`;
            const signature = await signer.signMessage(message);
            
            const keys = await generateDeterministicKeyPair(signature);
            
            // Store keys in localStorage
            localStorage.setItem(`chainseal_pub_${account}`, keys.publicKey);
            localStorage.setItem(`chainseal_priv_${account}`, keys.privateKey);
            
            console.log('🔑 Regenerated and stored encryption keys for registered center:', {
              account,
              publicKeyLength: keys.publicKey.length,
              privateKeyLength: keys.privateKey.length,
              publicKeyPreview: keys.publicKey.substring(0, 100) + '...'
            });
            
            // Verify the keys match what's on blockchain (without requesting another signature)
            try {
              const blockchainPubKeyBytes = await contract.getCenterPublicKey(account);
              const blockchainPubKeyPem = new TextDecoder().decode(ethers.utils.arrayify(blockchainPubKeyBytes));
              
              console.log('🔍 Key verification after regeneration:', {
                blockchainPublicKey: blockchainPubKeyPem.substring(0, 100) + '...',
                regeneratedPublicKey: keys.publicKey.substring(0, 100) + '...',
                keysMatch: blockchainPubKeyPem === keys.publicKey,
                blockchainKeyLength: blockchainPubKeyPem.length,
                regeneratedKeyLength: keys.publicKey.length
              });
              
              if (blockchainPubKeyPem !== keys.publicKey) {
                console.error('❌ Keys still do not match after regeneration');
                console.log('🔧 Attempting to re-register center with correct keys...');
                
                // The center was registered with different keys, so we need to re-register
                // with the keys that match our current MetaMask account
                try {
                  setKeyStatus('🔧 Re-registering center with correct keys...');
                  
                  // Re-register the center with the newly generated keys
                  const tx = await contract.registerExamCenter('HBM101', ethers.utils.toUtf8Bytes(keys.publicKey));
                  await tx.wait();
                  
                  console.log('✅ Successfully re-registered center with matching keys');
                  setKeyStatus('✅ Center re-registered with correct keys');
                  
                  setTimeout(() => setKeyStatus(''), 3000);
                } catch (reregisterError) {
                  console.error('Failed to re-register center:', reregisterError);
                  setKeyStatus('❌ Failed to re-register center. You may need to use the original MetaMask account.');
                }
              } else {
                console.log('✅ Keys match! Deterministic generation is working correctly.');
              }
            } catch (keyCheckError) {
              console.error('Error checking blockchain keys:', keyCheckError);
            }
          } else {
            console.log('🔑 Using existing keys from localStorage:', {
              account,
              publicKeyLength: existingPubKey.length,
              privateKeyLength: existingPrivKey.length
            });
          }
          
          setKeyStatus('');
        }
      } catch (error) {
        console.error("Error checking registration:", error);
        setKeyStatus('Error initializing security. Please reload.');
      }
    };

    checkAndGenerateKeys();
  }, [account, contract]);

  const handleRegisterCenter = async () => {
    if (!centerName.trim()) {
      alert('Please enter a center name');
      return;
    }

    try {
      setStatus('Registering center on blockchain...');
      const pubKey = localStorage.getItem(`chainseal_pub_${account}`);
      const tx = await contract.registerExamCenter(centerName, ethers.utils.toUtf8Bytes(pubKey));
      await tx.wait();
      setStatus('Center registered successfully!');
      setShowNamePrompt(false);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Registration failed:', error);
      setStatus(`Error: ${error.reason || error.message}`);
    }
  };

  const fetchPapers = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const count = await contract.paperCount();
      const fetchedPapers = [];
      
      for (let i = 1; i <= count.toNumber(); i++) {
        const paper = await contract.getPaper(i);
        
        // Check if this center has access to this paper
        const myKey = await contract.getMyPaperKey(i);
        if (myKey && myKey.length > 0 && paper.isScheduled) {
          const myClassroom = await contract.getMyClassroom(i);
          fetchedPapers.push({ 
            id: i, 
            ...paper,
            roomNumber: myClassroom
          });
        }
      }
      setPapers(fetchedPapers.reverse());
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showNamePrompt) {
      fetchPapers();
    }
  }, [contract, showNamePrompt]);

  const handleDownload = async (paper) => {
    const privKey = localStorage.getItem(`chainseal_priv_${account}`);
    if (!privKey) {
      setStatus('🔑 Security keys missing. Regenerating keys...');
      
      try {
        // Try to regenerate keys
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const message = `Generate ChainSeal encryption keys for Exam Center\nAccount: ${account}`;
        const signature = await signer.signMessage(message);
        
        const keys = await generateDeterministicKeyPair(signature);
        
        // Store keys in localStorage
        localStorage.setItem(`chainseal_pub_${account}`, keys.publicKey);
        localStorage.setItem(`chainseal_priv_${account}`, keys.privateKey);
        
        console.log('🔑 Regenerated keys for download:', {
          account,
          publicKeyLength: keys.publicKey.length,
          privateKeyLength: keys.privateKey.length
        });
        
        // Use the newly generated private key
        const newPrivKey = keys.privateKey;
        return handleDownloadWithKey(paper, newPrivKey);
        
      } catch (error) {
        console.error('Key regeneration failed:', error);
        setStatus('❌ Failed to regenerate security keys. Please reload the page.');
        return;
      }
    }

    return handleDownloadWithKey(paper, privKey);
  };

  const handleDownloadWithKey = async (paper, privKey) => {
    try {
      setDownloadingId(paper.id);
      setStatus('Fetching your encrypted key...');
      
      const encryptedKeyBytes = await contract.getMyPaperKey(paper.id);
      const encryptedKeyBase64 = ethers.utils.toUtf8String(encryptedKeyBytes);
      
      console.log('🔍 Download debug info:', {
        paperId: paper.id,
        account,
        encryptedKeyLength: encryptedKeyBase64.length,
        encryptedKeyPreview: encryptedKeyBase64.substring(0, 50) + '...',
        privateKeyLength: privKey.length,
        privateKeyPreview: privKey.substring(0, 50) + '...'
      });
      
      // Check what public key is registered on blockchain for this center
      const blockchainPubKeyBytes = await contract.getCenterPublicKey(account);
      const blockchainPubKeyPem = new TextDecoder().decode(ethers.utils.arrayify(blockchainPubKeyBytes));
      
      // Get current public key from localStorage (don't regenerate)
      const currentPubKey = localStorage.getItem(`chainseal_pub_${account}`);
      
      console.log('🔍 Key comparison for download:', {
        blockchainPublicKey: blockchainPubKeyPem.substring(0, 100) + '...',
        currentPublicKey: currentPubKey ? currentPubKey.substring(0, 100) + '...' : 'null',
        keysMatch: blockchainPubKeyPem === currentPubKey,
        blockchainKeyLength: blockchainPubKeyPem.length,
        currentKeyLength: currentPubKey ? currentPubKey.length : 0
      });
      
      if (!currentPubKey || blockchainPubKeyPem !== currentPubKey) {
        setStatus('❌ Key mismatch detected! Click "🔑 Fix Keys" button to regenerate your encryption keys.');
        console.error('❌ Key mismatch: The keys in localStorage do not match the public key registered on the blockchain for this center.');
        return;
      }
      
      setStatus('Fetching chunks and reassembling PDF...');
      const pdfBlob = await reassemblePDF(paper.ipfsCIDs, encryptedKeyBase64, privKey);
      
      setStatus('✅ Success! Opening PDF...');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url);
      
      // Auto-download as well
      const link = document.createElement('a');
      link.href = url;
      link.download = `${paper.examName}_${paper.subject}.pdf`;
      link.click();

      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Download failed:', error);
      
      if (error.message.includes('Invalid RSAES-OAEP padding')) {
        setStatus('❌ Decryption failed: Key mismatch detected. Click "🔑 Fix Keys" to regenerate your encryption keys.');
      } else {
        setStatus(`❌ Download failed: ${error.message}`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUnlock = async (paperId) => {
    try {
      setStatus('Unlocking paper on-chain...');
      const tx = await contract.unlockPaper(paperId);
      await tx.wait();
      setStatus('Paper unlocked successfully!');
      fetchPapers();
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Unlock failed:', error);
      
      // Handle specific error cases with user-friendly messages
      let errorMessage = '';
      if (error.reason === 'Too early to unlock' || error.message.includes('Too early to unlock')) {
        const paper = papers.find(p => p.id === paperId);
        const unlockTime = paper ? new Date(paper.unlockTimestamp.toNumber() * 1000).toLocaleString() : 'scheduled time';
        errorMessage = `⏰ Cannot unlock yet! This paper can only be unlocked at: ${unlockTime}`;
      } else if (error.reason === 'Paper not scheduled' || error.message.includes('not scheduled')) {
        errorMessage = '❌ This paper has not been scheduled by the Authority yet.';
      } else if (error.reason === 'Not authorized' || error.message.includes('not authorized')) {
        errorMessage = '🚫 You are not authorized to unlock this paper.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = '❌ Transaction was cancelled by user.';
      } else {
        errorMessage = `❌ Unlock failed: ${error.reason || error.message}`;
      }
      
      setStatus(errorMessage);
      setTimeout(() => setStatus(''), 5000); // Show error longer
    }
  };

  if (showNamePrompt) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-4">Register Your Exam Center</h2>
          <p className="text-[hsl(var(--color-text-secondary))] mb-6">
            Please enter a name for your exam center. This will be visible to the Exam Authority.
          </p>
          <input
            type="text"
            value={centerName}
            onChange={(e) => setCenterName(e.target.value)}
            placeholder="e.g., City High School"
            className="w-full px-4 py-2 bg-[hsl(var(--color-bg-secondary))] border border-[hsl(var(--color-border))] rounded-lg mb-4"
          />
          <button onClick={handleRegisterCenter} className="btn-primary w-full">
            Register Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Generation Status / Error */}
      {keyStatus && (
         <div className="glass-card p-4 flex items-center justify-center gap-3 bg-blue-500/10 border-blue-500/20 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            {keyStatus}
         </div>
      )}

      {status && (
        <div className={`glass-card p-4 text-sm text-center animate-in slide-in-from-top-4 duration-300 ${
          status.includes('❌') || status.includes('🚫') || status.includes('⏰') 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : status.includes('✅') || status.includes('Success')
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
        }`}>
          {status.includes('Unlocking') || status.includes('Registering') ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              {status}
            </div>
          ) : (
            status
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Assigned Papers</h2>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              try {
                setStatus('🔧 Re-registering center...');
                
                // Generate fresh keys
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const message = `Generate ChainSeal encryption keys for Exam Center\nAccount: ${account}`;
                const signature = await signer.signMessage(message);
                const keys = await generateDeterministicKeyPair(signature);
                
                // Store the new keys
                localStorage.setItem(`chainseal_pub_${account}`, keys.publicKey);
                localStorage.setItem(`chainseal_priv_${account}`, keys.privateKey);
                
                // Re-register with new keys
                const tx = await contract.registerExamCenter('HBM101', ethers.utils.toUtf8Bytes(keys.publicKey));
                await tx.wait();
                
                setStatus('✅ Center re-registered successfully!');
                setTimeout(() => setStatus(''), 3000);
              } catch (error) {
                console.error('Re-registration failed:', error);
                setStatus(`❌ Re-registration failed: ${error.message}`);
              }
            }}
            className="btn-outline text-xs py-1 px-3 text-green-500"
            title="Re-register this center with current MetaMask account keys"
          >
            🔧 Re-register Center
          </button>
          <button 
            onClick={() => {
              // Clear localStorage keys and reload
              localStorage.removeItem(`chainseal_pub_${account}`);
              localStorage.removeItem(`chainseal_priv_${account}`);
              window.location.reload();
            }} 
            className="btn-outline text-xs py-1 px-3 text-yellow-500"
            title="Clear stored keys and regenerate them"
          >
            🔑 Fix Keys
          </button>
          <button onClick={fetchPapers} disabled={loading} className="btn-outline text-xs py-1 px-3">
            Refresh
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Fetching scheduled papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="p-12 text-center opacity-50">
            <p>No papers have been assigned to your center yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {papers.map((paper) => (
              <div key={paper.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg">{paper.examName}</h4>
                    <p className="text-sm text-[hsl(var(--color-text-secondary))]">{paper.subject}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge-${paper.isUnlocked ? 'success' : 'primary'}`}>
                      {paper.isUnlocked ? 'Unlocked' : 'Scheduled'}
                    </span>
                    <p className="text-[10px] mt-1 font-mono">{paper.roomNumber}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-[hsl(var(--color-text-muted))]">
                    <div>Unlock Time: {new Date(paper.unlockTimestamp.toNumber() * 1000).toLocaleString()}</div>
                    {!paper.isUnlocked && (
                      <div className={`mt-1 font-mono ${
                        paper.unlockTimestamp.toNumber() * 1000 <= currentTime 
                          ? 'text-green-400 animate-pulse' 
                          : 'text-yellow-400'
                      }`}>
                        {getTimeRemaining(paper.unlockTimestamp)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!paper.isUnlocked ? (
                      <button
                        onClick={() => handleUnlock(paper.id)}
                        disabled={paper.unlockTimestamp.toNumber() * 1000 > currentTime}
                        className={`py-1.5 px-4 text-xs font-bold rounded transition-all ${
                          paper.unlockTimestamp.toNumber() * 1000 <= currentTime
                            ? 'btn-primary animate-pulse'
                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                        }`}
                        title={paper.unlockTimestamp.toNumber() * 1000 > currentTime 
                          ? `Cannot unlock until ${new Date(paper.unlockTimestamp.toNumber() * 1000).toLocaleString()}`
                          : 'Click to unlock this paper'
                        }
                      >
                        {paper.unlockTimestamp.toNumber() * 1000 <= currentTime ? '🔓 Unlock Now' : '⏰ Locked'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownload(paper)}
                        disabled={downloadingId === paper.id}
                        className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-2"
                      >
                        {downloadingId === paper.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          '📄 Download & Decrypt'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamCenterDashboard;

