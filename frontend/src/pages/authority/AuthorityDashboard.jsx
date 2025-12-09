import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import ScheduleExamModal from '../../components/authority/ScheduleExamModal';
import { generateDeterministicKeyPair } from '../../utils/crypto';
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

  const registerAsAuthority = async () => {
    if (!contract || !account) return;
    
    try {
      setKeyStatus('🔄 Registering as Authority...');
      setCheckingRegistration(true);
      
      // Generate deterministic keys from MetaMask signature
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const message = `Generate ChainSeal encryption keys for Authority\nAccount: ${account}`;
      const signature = await signer.signMessage(message);
      const keys = await generateDeterministicKeyPair(signature);
      
      // Register authority public key on blockchain
      const tx = await contract.registerAuthority(ethers.utils.toUtf8Bytes(keys.publicKey));
      setKeyStatus('⏳ Waiting for blockchain confirmation...');
      await tx.wait();
      
      // Update status
      setKeyStatus(`✅ Successfully registered as Authority (${account.slice(0, 6)}...${account.slice(-4)})`);
      setIsRegistered(true);
      
      // Refresh papers since teachers can now upload
      fetchAllPapers();
      
    } catch (error) {
      console.error('Registration failed:', error);
      setKeyStatus(`❌ Registration failed: ${error.message}`);
    } finally {
      setCheckingRegistration(false);
    }
  };

  useEffect(() => {
    const checkAndGenerateKeys = async () => {
      if (!account || !contract) return;

      try {
        setCheckingRegistration(true);
        
        // Check if Authority is registered
        const authorityPubKeyBytes = await contract.authorityPublicKey();
        
        if (!authorityPubKeyBytes || authorityPubKeyBytes === '0x') {
          setKeyStatus('❌ No Authority registered yet. Click "Register as Authority" to set up your keys.');
          setIsRegistered(false);
          setCheckingRegistration(false);
          return;
        }

        // Generate keys from current account to check if it matches
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const message = `Generate ChainSeal encryption keys for Authority\nAccount: ${account}`;
        const signature = await signer.signMessage(message);
        const keys = await generateDeterministicKeyPair(signature);
        
        // Compare with registered public key
        const registeredPubKey = ethers.utils.toUtf8String(authorityPubKeyBytes);
        const isCurrentAccountAuthority = keys.publicKey === registeredPubKey;
        
        if (isCurrentAccountAuthority) {
          setKeyStatus(`✅ You are the registered Authority (${account.slice(0, 6)}...${account.slice(-4)})`);
          setIsRegistered(true);
        } else {
          setKeyStatus(`⚠️ You are NOT the registered Authority. Switch to the correct MetaMask account to schedule exams.`);
          setIsRegistered(false);
        }
        
      } catch (error) {
        console.error('Error checking authority status:', error);
        setKeyStatus(`❌ Error checking authority status: ${error.message}`);
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
      {/* Authority Status */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              checkingRegistration ? 'bg-yellow-500 animate-pulse' : 
              isRegistered ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <div>
              <h3 className="font-semibold text-sm">Authority Status</h3>
              <p className="text-xs text-[hsl(var(--color-text-secondary))]">
                {keyStatus}
              </p>
            </div>
          </div>
          {!isRegistered && !checkingRegistration && (
            <div className="flex gap-2">
              <button 
                onClick={registerAsAuthority}
                className="text-xs text-green-500 bg-green-500/10 px-3 py-1 rounded hover:bg-green-500/20"
              >
                📝 Register as Authority
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="text-xs text-blue-500 bg-blue-500/10 px-3 py-1 rounded hover:bg-blue-500/20"
              >
                🔄 Refresh Status
              </button>
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
                        disabled={!isRegistered || checkingRegistration}
                        className={`py-1.5 px-4 text-xs font-bold uppercase tracking-wider rounded ${
                          isRegistered && !checkingRegistration 
                            ? 'btn-primary' 
                            : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                        }`}
                        title={!isRegistered ? 'You must be the registered Authority to schedule papers' : ''}
                      >
                        {checkingRegistration ? 'Checking...' : 'Schedule'}
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

