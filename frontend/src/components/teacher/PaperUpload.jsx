import { useState } from 'react';
import { processPDF } from '../../utils/pdf/processor';
import { uploadToIPFS } from '../../services/pinata';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { encryptWithPublicKey } from '../../utils/crypto';

const PaperUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [examCenter, setExamCenter] = useState('');
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
    if (!file || !examName || !subject || !examCenter) return;

    if (!contract) {
      alert('Contract not initialized. Please connect your wallet.');
      return;
    }

    try {
      setLoading(true);
      setStatus('Processing and Encrypting PDF...');
      
      const { chunks, aesKey } = await processPDF(file);
      
      setStatus(`Uploading ${chunks.length} chunks to IPFS...`);
      const ipfsCIDs = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkBlob = new Blob([JSON.stringify(chunks[i])], { type: 'application/json' });
        const cid = await uploadToIPFS(chunkBlob, `${examName}_chunk_${i}.json`);
        ipfsCIDs.push(cid);
        setStatus(`Uploaded chunk ${i + 1}/${chunks.length}...`);
      }

      setStatus('Fetching Exam Center Public Key...');
      const pkBytes = await contract.getExamCenterPublicKey(examCenter);
      
      if (!pkBytes || pkBytes === '0x') {
        throw new Error('This address has not registered a public key as an Exam Center.');
      }

      const publicKeyPem = new TextDecoder().decode(ethers.utils.arrayify(pkBytes));
      
      setStatus('Encrypting AES Key with Center Public Key...');
      const encryptedKeyBase64 = encryptWithPublicKey(aesKey, publicKeyPem);
      const encryptedKeyBytes = ethers.utils.toUtf8Bytes(encryptedKeyBase64);

      setStatus('Submitting to Blockchain...');
      
      const tx = await contract.uploadPaper(
        examName,
        subject,
        ipfsCIDs,
        encryptedKeyBytes
      );
      
      setStatus('Waiting for block confirmation...');
      await tx.wait();
      
      setStatus('Success! Paper registered on blockchain.');
      setFile(null);
      setExamName('');
      setSubject('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error('Upload failed:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-6">Upload New Question Paper</h3>
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
          <label className="block text-sm font-medium mb-1">Target Exam Center Address</label>
          <input
            type="text"
            className="input-field font-mono text-sm"
            placeholder="0x..."
            value={examCenter}
            onChange={(e) => setExamCenter(e.target.value)}
            disabled={loading}
            required
          />
          <p className="text-[10px] text-[hsl(var(--color-text-muted))] mt-1">
            Only this center's private key can decrypt the paper.
          </p>
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
          <div className={`p-3 rounded-lg text-sm ${status.includes('Error') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
            <div className="flex items-center gap-2">
              {loading && !status.includes('Error') && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{status}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full py-3 text-lg font-semibold"
          disabled={loading || !file}
        >
          {loading ? 'Processing...' : 'Securely Upload to Blockchain'}
        </button>
      </form>
    </div>
  );
};

export default PaperUpload;
