import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { reassemblePDF } from '../../utils/pdf/reassembler';
import { combineShares } from '../../utils/shamirSecretSharing';
import { decryptKeyWithMasterKey, decryptAES } from '../../utils/crypto';
import { ethers } from 'ethers';
import axios from 'axios';

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

  // Auto-check center registration on mount/account change
  useEffect(() => {
    const checkRegistration = async () => {
      if (!account || !contract) return;

      try {
        setKeyStatus('Checking registration...');
        
        // Check if center is registered
        const centerInfo = await contract.centers(account);
        
        console.log('🔍 Center registration check:', {
          account,
          isRegistered: centerInfo.isRegistered,
          centerName: centerInfo.name
        });
        
        if (!centerInfo.isRegistered) {
          setKeyStatus('');
          setShowNamePrompt(true);
        } else {
          setKeyStatus('');
        }
      } catch (error) {
        console.error("Error checking registration:", error);
        setKeyStatus('Error checking registration. Please reload.');
      }
    };

    checkRegistration();
  }, [account, contract]);

  const handleRegisterCenter = async () => {
    if (!centerName.trim()) {
      alert('Please enter a center name');
      return;
    }

    try {
      setStatus('Registering center on blockchain...');
      // In the time-locked system, we don't need RSA keys for centers
      // Just register with a placeholder public key
      const placeholderKey = ethers.utils.toUtf8Bytes('time-locked-system');
      const tx = await contract.registerExamCenter(centerName, placeholderKey);
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
        
        // Check if this center is assigned to this paper using new method
        const isAssigned = await contract.isAssignedToCenter(i, account);
        if (isAssigned && paper.isScheduled) {
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
    try {
      setDownloadingId(paper.id);
      setStatus('🔐 Fetching decryption shares from blockchain...');
      
      // Get the encrypted K1 and master key shares from the contract
      const [encryptedK1Bytes, shareBytes, threshold] = await contract.getDecryptionShares(paper.id);
      
      // Decode the data
      const encryptedK1BytesArray = ethers.utils.arrayify(encryptedK1Bytes);
      const encryptedK1 = new TextDecoder().decode(encryptedK1BytesArray);
      
      const shares = shareBytes.map(bytes => {
        const arr = ethers.utils.arrayify(bytes);
        return new TextDecoder().decode(arr);
      });
      
      console.log('🔍 Decryption data from blockchain:', {
        paperId: paper.id,
        encryptedK1Length: encryptedK1.length,
        sharesCount: shares.length,
        threshold,
        unlockTimestamp: paper.unlockTimestamp.toNumber(),
        currentTime: Math.floor(Date.now() / 1000)
      });
      
      setStatus('🗂️ Reconstructing Master Key (K2) from Shamir shares...');
      
      // Combine shares to get the master key (K2)
      // This will only work if we have enough shares
      const masterKey = combineShares(shares);
      
      setStatus('🔓 Decrypting Paper Key (K1) using Master Key...');
      
      // Decrypt K1 using K2
      const aesKey = await decryptKeyWithMasterKey(encryptedK1, masterKey);
      
      console.log('✅ Master key reconstruction and K1 decryption successful');
      
      setStatus('📦 Fetching and decrypting PDF chunks from IPFS...');
      
      // Now use the decrypted AES key (K1) to reassemble the PDF
      
      const decryptedChunks = [];
      for (let i = 0; i < paper.ipfsCIDs.length; i++) {
        const cid = paper.ipfsCIDs[i];
        console.log(`📥 Fetching chunk ${i + 1}/${paper.ipfsCIDs.length}: ${cid}`);
        
        // Try dedicated gateway first, then fallback
        let response;
        const dedicatedGateway = import.meta.env.VITE_GATEWAY_URL;
        const gatewayKey = import.meta.env.VITE_GATEWAY_KEY;

        try {
          if (dedicatedGateway && gatewayKey) {
            response = await axios.get(`https://${dedicatedGateway}/ipfs/${cid}?pinataGatewayToken=${gatewayKey}`, {
              withCredentials: false
            });
          } else {
            throw new Error('Dedicated gateway not configured');
          }
        } catch (gatewayError) {
          try {
            response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
              withCredentials: false 
            });
          } catch (pinataError) {
            response = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
              withCredentials: false
            });
          }
        }
        
        const { iv, encryptedData } = response.data;
        const decryptedChunk = await decryptAES(encryptedData, iv, aesKey);
        decryptedChunks.push(decryptedChunk);
        
        setStatus(`📦 Decrypted chunk ${i + 1}/${paper.ipfsCIDs.length}...`);
      }
      
      // Merge chunks
      const totalLength = decryptedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of decryptedChunks) {
        mergedArray.set(chunk, offset);
        offset += chunk.length;
      }
      
      const pdfBlob = new Blob([mergedArray], { type: 'application/pdf' });
      
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
      
      if (error.message.includes('Access denied') || error.message.includes('Time-lock active')) {
        setStatus(`⏰ ${error.message}`);
      } else if (error.message.includes('Not assigned')) {
        setStatus('❌ You are not assigned to this paper.');
      } else if (error.message.includes('not unlocked yet')) {
        setStatus('❌ Paper has not been unlocked yet. Click \"Unlock Now\" first.');
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

