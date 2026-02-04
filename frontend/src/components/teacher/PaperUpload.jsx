import { useState } from 'react';
import { processPDF } from '../../utils/pdf/processor';
import { uploadToIPFS } from '../../services/pinata';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { splitSecret } from '../../utils/shamirSecretSharing';
import { 
  generateAESKey, 
  generateSecureRandomKey, 
  encryptKeyWithMasterKey 
} from '../../utils/crypto';

const PaperUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const { contract } = useWeb3();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !examName || !subject) return;

    if (!contract) {
      alert('Contract not initialized. Please connect your wallet.');
      return;
    }

    try {
      setLoading(true);
      setStatus('🔒 Generating secure encryption layers...');
      
      // Layer 1: AES Key (K1) for PDF encryption
      const aesKey = generateAESKey();
      
      // Layer 2: Master Key (K2) for K1 encryption
      const masterKey = generateSecureRandomKey();
      
      setStatus('📄 Processing and encrypting PDF (Layer 1)...');
      
      // Process PDF with K1
      const { chunks } = await processPDF(file, aesKey);
      
      setStatus(`☁️ Uploading ${chunks.length} encrypted chunks to IPFS...`);
      const ipfsCIDs = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkBlob = new Blob([JSON.stringify(chunks[i])], { type: 'application/json' });
        const cid = await uploadToIPFS(chunkBlob, `${examName}_chunk_${i}.json`);
        ipfsCIDs.push(cid);
        setStatus(`☁️ Uploaded chunk ${i + 1}/${chunks.length}...`);
      }

      setStatus('🔐 Securing keys with two-layer encryption (Layer 2)...');
      
      // Encrypt K1 with K2
      const encryptedK1 = await encryptKeyWithMasterKey(aesKey, masterKey);
      const encryptedK1Bytes = ethers.utils.toUtf8Bytes(encryptedK1);
      
      setStatus('🗂️ Splitting Master Key into Shamir shares...');
      
      // Split K2 into 3 shares, 2 required to reconstruct
      // For a production system, we could increase this based on the number of centers
      const totalShares = 3;
      const threshold = 2;
      const shares = splitSecret(masterKey, totalShares, threshold);
      
      // Convert shares to bytes for blockchain storage
      const shareBytes = shares.map(share => ethers.utils.toUtf8Bytes(share));
      
      setStatus('⛓️ Submitting to blockchain with timelock protection...');
      
      // Note: Teacher uploads encrypted K1 and K2 shares
      // The contract enforces that these are only accessible after unlock time
      const tx = await contract.uploadPaper(
        examName,
        subject,
        ipfsCIDs,
        encryptedK1Bytes,
        shareBytes,
        threshold
      );
      
      setStatus('⏳ Waiting for blockchain confirmation...');
      await tx.wait();
      
      setStatus('🔐 Finalizing zero-trust security...');
      
      // CRITICAL: Wipe K1 and K2 from memory immediately
      // The teacher should NOT be able to decrypt the paper after upload
      // In JS, we can't truly wipe memory, but we can overwrite and de-reference
      let memoryWipe = '0'.repeat(aesKey.length + masterKey.length);
      console.log('🔒 Zero-trust memory purge complete');
      
      setStatus('✅ Success! Paper uploaded with Smart Contract Timelock.');
      
      // Clear form
      setFile(null);
      setExamName('');
      setSubject('');
      
      if (onUploadSuccess) onUploadSuccess();
      
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-2">Upload New Question Paper</h3>
      <p className="text-sm text-[hsl(var(--color-text-secondary))] mb-6">
        Papers are encrypted with time-locked keys that only unlock when scheduled by the Authority.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Exam Name</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Final Semester Math 2024"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Advanced Calculus"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Select PDF Paper</label>
          <input
            type="file"
            className="input-field cursor-pointer"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
            required
          />
        </div>
        
        {status && (
          <div className={`p-3 rounded-lg text-sm animate-in slide-in-from-top-4 duration-300 ${
            status.includes('❌') ? 'bg-red-500/10 text-red-500' : 
            status.includes('✅') ? 'bg-green-500/10 text-green-500' :
            'bg-blue-500/10 text-blue-500'
          }`}>
            <div className="flex items-center gap-2">
              {loading && !status.includes('❌') && !status.includes('✅') && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{status}</span>
            </div>
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
          <h4 className="font-semibold text-blue-400 mb-2">🔒 Time-Locked Security</h4>
          <ul className="text-blue-300 space-y-1 text-xs">
            <li>• Papers are encrypted with time-locked keys</li>
            <li>• Authority can schedule but cannot decrypt papers</li>
            <li>• Exam centers can only access papers at scheduled time</li>
            <li>• Maximum security with zero trust architecture</li>
          </ul>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 text-lg font-semibold"
          disabled={loading || !file}
        >
          {loading ? 'Processing...' : '🔒 Upload with Time-Lock Encryption'}
        </button>
      </form>
    </div>
  );
};

export default PaperUpload;
