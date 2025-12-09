import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import ScheduleExamModal from '../../components/authority/ScheduleExamModal';
import { generateKeyPair } from '../../utils/crypto';
import { ethers } from 'ethers';

const AuthorityDashboard = () => {
  const { contract, account } = useWeb3();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [txStatus, setTxStatus] = useState('');
  const [keyStatus, setKeyStatus] = useState('Checking authority keys...');
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  const fetchAllPapers = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const count = await contract.paperCount();
      const fetchedPapers = [];
      for (let i = 1; i <= count.toNumber(); i++) {
        const paper = await contract.getPaper(i);
        fetchedPapers.push({
          id: i,
          examName: paper.examName,
          subject: paper.subject,
          teacher: paper.teacher,
          isScheduled: paper.isScheduled,
          isUnlocked: paper.isUnlocked,
          unlockTimestamp: paper.unlockTimestamp,
          uploadTimestamp: paper.uploadTimestamp,
          authorityEncryptedKey: paper.authorityEncryptedKey,
          ipfsCIDs: paper.ipfsCIDs
        });
      }
      setPapers(fetchedPapers.reverse()); // Newest first
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAndGenerateKeys = async () => {
      if (!account || !contract) return;

      const privKey = localStorage.getItem(`chainseal_priv_${account}`);
      const pubKey = localStorage.getItem(`chainseal_pub_${account}`);

      if (!privKey || !pubKey) {
        setKeyStatus('Initializing authority keys...');
        try {
          const keys = await generateKeyPair();
          localStorage.setItem(`chainseal_priv_${account}`, keys.privateKey);
          localStorage.setItem(`chainseal_pub_${account}`, keys.publicKey);
          
          // Register authority public key
          const tx = await contract.registerAuthority(ethers.utils.toUtf8Bytes(keys.publicKey));
          await tx.wait();
          setKeyStatus('');
          setIsRegistered(true);
        } catch (error) {
          console.error("Key generation failed:", error);
          setKeyStatus('Error initializing keys. Please reload.');
          setIsRegistered(false);
        }
      } else {
        setKeyStatus('');
      }
      
      // Check if already registered on blockchain
      try {
        setCheckingRegistration(true);
        const authorityPubKey = await contract.authorityPublicKey();
        const isReg = authorityPubKey && authorityPubKey !== '0x' && authorityPubKey.length > 0;
        setIsRegistered(isReg);
      } catch (error) {
        console.error('Error checking registration:', error);
        setIsRegistered(false);
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkAndGenerateKeys();
    fetchAllPapers();
  }, [contract, account]);

  const handleSchedule = async (paperId, unlockTimestamp, centers, classrooms, encryptedKeys) => {
    try {
      setTxStatus('Initiating transaction...');
      const tx = await contract.scheduleExam(paperId, unlockTimestamp, centers, classrooms, encryptedKeys);
      
      setTxStatus('Waiting for blockchain confirmation...');
      await tx.wait();
      
      setTxStatus('Success! Exam scheduled.');
      setSelectedPaper(null);
      fetchAllPapers();
      
      // Clear status after 3 seconds
      setTimeout(() => setTxStatus(''), 3000);
    } catch (error) {
      console.error('Scheduling failed:', error);
      setTxStatus(`Error: ${error.reason || error.message}`);
    }
  };

  const getStatusBadge = (paper) => {
    if (paper.isUnlocked) return <span className="badge-success">Unlocked</span>;
    if (paper.isScheduled) return <span className="badge-primary">Scheduled</span>;
    return <span className="badge-secondary">Pending Schedule</span>;
  };

  return (
    <div className="space-y-8">
      {keyStatus && (
        <div className="glass-card p-4 flex items-center justify-center gap-3 bg-blue-500/10 border-blue-500/20 text-blue-400">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          {keyStatus}
        </div>
      )}
      
      {/* Registration Status Badge */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-red-500'} ${checkingRegistration ? 'animate-pulse' : ''}`}></div>
            <div>
              <h3 className="font-semibold text-sm">Authority Registration Status</h3>
              <p className="text-xs text-[hsl(var(--color-text-secondary))]">
                {checkingRegistration ? 'Checking blockchain...' : 
                 isRegistered ? '✅ Registered on Sepolia - Ready to schedule papers' : 
                 '❌ Not registered - Papers cannot be uploaded yet'}
              </p>
            </div>
          </div>
          {!isRegistered && !checkingRegistration && (
            <div className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded">
              ⚠️ Logout and login again to register
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Exam Authority Dashboard</h2>
          <p className="text-[hsl(var(--color-text-secondary))]">Review uploaded papers and allocate exam schedules</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[hsl(var(--color-text-muted))] uppercase font-bold">Admin View</span>
          <button onClick={fetchAllPapers} disabled={loading} className="btn-outline py-2 px-4 text-xs">
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {txStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${txStatus.includes('Error') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
          {!txStatus.includes('Error') && !txStatus.includes('Success') && (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          )}
          <span className="text-sm font-medium">{txStatus}</span>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading && papers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[hsl(var(--color-primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading papers from blockchain...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-[hsl(var(--color-text-secondary))]">No papers have been uploaded to the system yet.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[hsl(var(--color-bg-secondary))] text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold text-[hsl(var(--color-text-muted))]">Paper Details</th>
                <th className="px-6 py-4 font-semibold text-[hsl(var(--color-text-muted))]">Teacher</th>
                <th className="px-6 py-4 font-semibold text-[hsl(var(--color-text-muted))]">Status</th>
                <th className="px-6 py-4 font-semibold text-[hsl(var(--color-text-muted))] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--color-border))]">
              {papers.map((paper) => (
                <tr key={paper.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{paper.examName}</div>
                    <div className="text-xs text-[hsl(var(--color-text-muted))]">{paper.subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono bg-black/20 p-1.5 rounded inline-block">
                      {paper.teacher.slice(0, 6)}...{paper.teacher.slice(-4)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(paper)}
                    {paper.isScheduled && (
                      <div className="text-[10px] mt-1 text-[hsl(var(--color-text-muted))]">
                        Time: {new Date(paper.unlockTimestamp.toNumber() * 1000).toLocaleString()} <br/>
                        Room: {paper.roomNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!paper.isScheduled ? (
                      <button 
                        onClick={() => setSelectedPaper(paper)}
                        className="btn-primary py-1.5 px-4 text-xs font-bold uppercase tracking-wider"
                      >
                        Schedule
                      </button>
                    ) : (
                      <span className="text-[10px] text-success font-bold uppercase">Locked 🛡️</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedPaper && (
        <ScheduleExamModal 
          paper={selectedPaper} 
          onClose={() => setSelectedPaper(null)} 
          onSchedule={handleSchedule}
        />
      )}
    </div>
  );
};

export default AuthorityDashboard;

