import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { reassemblePDF } from '../../utils/pdf/reassembler';
import { generateKeyPair } from '../../utils/crypto';
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

  // Auto-generate keys and register center on mount/account change
  useEffect(() => {
    const checkAndGenerateKeys = async () => {
      if (!account || !contract) return;

      const privKey = localStorage.getItem(`chainseal_priv_${account}`);
      const pubKey = localStorage.getItem(`chainseal_pub_${account}`);

      if (!privKey || !pubKey) {
        setKeyStatus('Initializing secure environment (generating keys)...');
        try {
          const keys = await generateKeyPair();
          localStorage.setItem(`chainseal_priv_${account}`, keys.privateKey);
          localStorage.setItem(`chainseal_pub_${account}`, keys.publicKey);
          
          // Check if center is registered
          const centerInfo = await contract.centers(account);
          if (!centerInfo.isRegistered) {
            setKeyStatus('');
            setShowNamePrompt(true);
          } else {
            setKeyStatus('');
          }
        } catch (error) {
          console.error("Key generation failed:", error);
          setKeyStatus('Error initializing security. Please reload.');
        }
      } else {
        // Check if center is registered
        try {
          const centerInfo = await contract.centers(account);
          if (!centerInfo.isRegistered) {
            setShowNamePrompt(true);
          }
          setKeyStatus('');
        } catch (error) {
          console.error("Error checking registration:", error);
          setKeyStatus('');
        }
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
      alert('Security keys missing. Please reload the page.');
      return;
    }

    try {
      setDownloadingId(paper.id);
      setStatus('Fetching your encrypted key...');
      
      const encryptedKeyBytes = await contract.getMyPaperKey(paper.id);
      const encryptedKeyBase64 = ethers.utils.toUtf8String(encryptedKeyBytes);
      
      setStatus('Fetching chunks and reassembling PDF...');
      const pdfBlob = await reassemblePDF(paper.ipfsCIDs, encryptedKeyBase64, privKey);
      
      setStatus('Success! Opening PDF...');
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
      setStatus(`Error: ${error.message}`);
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
    } catch (error) {
      console.error('Unlock failed:', error);
      setStatus(`Error: ${error.reason || error.message}`);
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
        <div className="glass-card p-4 bg-blue-500/10 border-blue-500/20 text-blue-500 text-sm animate-pulse text-center">
          {status}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Assigned Papers</h2>
        <button onClick={fetchPapers} disabled={loading} className="btn-outline text-xs py-1 px-3">
          Refresh
        </button>
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
                    Unlock Time: {new Date(paper.unlockTimestamp.toNumber() * 1000).toLocaleString()}
                  </div>
                  
                  <div className="flex gap-2">
                    {!paper.isUnlocked ? (
                      <button
                        onClick={() => handleUnlock(paper.id)}
                        className="btn-outline py-1.5 px-4 text-xs font-bold"
                      >
                        Unlock
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
                          'Download & Decrypt'
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

