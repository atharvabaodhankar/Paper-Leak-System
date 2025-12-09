import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { decryptWithPrivateKey, encryptWithPublicKey, generateDeterministicKeyPair } from '../../utils/crypto';
import { ethers } from 'ethers';

const ScheduleExamModal = ({ paper, onClose, onSchedule }) => {
  const { contract, account } = useWeb3();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedCenters, setSelectedCenters] = useState([{ centerAddress: '', classroom: '' }]);

  useEffect(() => {
    const fetchCenters = async () => {
      if (!contract) return;
      try {
        const [addresses, names] = await contract.getAllCenters();
        const centerList = addresses.map((addr, idx) => ({
          address: addr,
          name: names[idx]
        }));
        setCenters(centerList);
      } catch (error) {
        console.error('Error fetching centers:', error);
      }
    };

    fetchCenters();
  }, [contract]);

  const addCenterRow = () => {
    setSelectedCenters([...selectedCenters, { centerAddress: '', classroom: '' }]);
  };

  const removeCenterRow = (index) => {
    if (selectedCenters.length > 1) {
      setSelectedCenters(selectedCenters.filter((_, i) => i !== index));
    }
  };

  const updateCenterRow = (index, field, value) => {
    const updated = [...selectedCenters];
    updated[index][field] = value;
    setSelectedCenters(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const validCenters = selectedCenters.filter(c => c.centerAddress && c.classroom);
    if (validCenters.length === 0) {
      alert('Please select at least one center and provide a classroom');
      return;
    }

    if (!date || !time) {
      alert('Please provide date and time');
      return;
    }

    try {
      setLoading(true);
      
      // Construct timestamp
      const scheduledDateTime = new Date(`${date}T${time}`);
      const unlockTimestamp = Math.floor(scheduledDateTime.getTime() / 1000);
      
      const now = Math.floor(Date.now() / 1000);
      if (unlockTimestamp <= now) {
        alert('Unlock time must be in the future');
        setLoading(false);
        return;
      }

      // Regenerate Authority's private key from MetaMask signature
      let authorityPrivKey;
      let masterAESKey;
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const message = `Generate ChainSeal encryption keys for Authority\nAccount: ${account}`;
        const signature = await signer.signMessage(message);
        
        // Generate deterministic keys from signature
        const keys = await generateDeterministicKeyPair(signature);
        authorityPrivKey = keys.privateKey;
        
        console.log('🔍 Key generation details:', {
          account,
          signatureLength: signature.length,
          privateKeyLength: authorityPrivKey.length,
          publicKeyLength: keys.publicKey.length
        });
        
        // Get the Authority's public key from blockchain to verify
        const blockchainPubKey = await contract.authorityPublicKey();
        const blockchainPubKeyPem = ethers.utils.toUtf8String(blockchainPubKey);
        
        console.log('🔍 Key comparison:', {
          generatedPublicKey: keys.publicKey.substring(0, 100) + '...',
          blockchainPublicKey: blockchainPubKeyPem.substring(0, 100) + '...',
          keysMatch: keys.publicKey === blockchainPubKeyPem
        });
        
        if (keys.publicKey !== blockchainPubKeyPem) {
          throw new Error('Key mismatch: You are not the same Authority who registered the public key. Please use the MetaMask account that originally registered as Authority.');
        }
        
        // Try to decrypt the master AES key
        const encryptedMasterKeyBase64 = ethers.utils.toUtf8String(paper.authorityEncryptedKey);
        console.log('🔍 Attempting to decrypt master key:', {
          encryptedKeyLength: encryptedMasterKeyBase64.length,
          privateKeyLength: authorityPrivKey.length
        });
        
        masterAESKey = decryptWithPrivateKey(encryptedMasterKeyBase64, authorityPrivKey);
        console.log('✅ Successfully decrypted master AES key');
        
      } catch (error) {
        console.error('Error regenerating encryption keys:', error);
        
        let errorMessage = `Failed to regenerate encryption keys: ${error.message}\n\n`;
        
        if (error.message.includes('Invalid RSAES-OAEP padding')) {
          errorMessage += `This error indicates a key mismatch. Possible causes:\n\n`;
          errorMessage += `1. You're not the same Authority who registered the public key\n`;
          errorMessage += `2. The paper was encrypted with a different Authority's key\n`;
          errorMessage += `3. You switched MetaMask accounts\n\n`;
          errorMessage += `Solution: Use the same MetaMask account that originally registered as Authority.`;
        } else if (error.message.includes('Key mismatch')) {
          errorMessage += `Please switch to the MetaMask account that originally registered as Authority.`;
        } else {
          errorMessage += `Other possible causes:\n`;
          errorMessage += `1. Authority hasn't registered yet\n`;
          errorMessage += `2. Paper was uploaded before Authority registration\n`;
          errorMessage += `3. Network or blockchain connection issues`;
        }
        
        alert(errorMessage);
        setLoading(false);
        return;
      }

      // Check if paper has authorityEncryptedKey
      console.log('🔍 DEBUG: Paper data:', {
        paperId: paper.id,
        examName: paper.examName,
        authorityEncryptedKey: paper.authorityEncryptedKey,
        keyType: typeof paper.authorityEncryptedKey,
        keyLength: paper.authorityEncryptedKey?.length,
        isHex: paper.authorityEncryptedKey?.startsWith?.('0x')
      });
      
      if (!paper.authorityEncryptedKey || paper.authorityEncryptedKey === '0x' || paper.authorityEncryptedKey.length <= 2) {
        alert('This paper does not have an encrypted key for the Authority. The paper may have been uploaded before Authority registration. Please re-upload the paper.');
        setLoading(false);
        return;
      }

      // Re-encrypt for each selected center
      const centerAddresses = [];
      const classrooms = [];
      const encryptedKeys = [];

      for (const center of validCenters) {
        const centerPubKeyBytes = await contract.getCenterPublicKey(center.centerAddress);
        
        if (!centerPubKeyBytes || centerPubKeyBytes === '0x' || centerPubKeyBytes.length === 0) {
          alert(`Center ${center.centerAddress} has not registered a public key yet.`);
          setLoading(false);
          return;
        }
        
        const centerPubKeyPem = ethers.utils.toUtf8String(centerPubKeyBytes);
        
        const reEncryptedKey = encryptWithPublicKey(masterAESKey, centerPubKeyPem);
        
        centerAddresses.push(center.centerAddress);
        classrooms.push(center.classroom);
        encryptedKeys.push(ethers.utils.toUtf8Bytes(reEncryptedKey));
      }

      await onSchedule(paper.id, unlockTimestamp, centerAddresses, classrooms, encryptedKeys);
    } catch (error) {
      console.error('Scheduling error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card w-full max-w-2xl p-8 my-8 animate-in fade-in zoom-in duration-300">
        <h3 className="text-2xl font-bold mb-2">Schedule Exam (Multi-Center)</h3>
        <p className="text-[hsl(var(--color-text-secondary))] mb-6 text-sm">
          Assign: <span className="text-[hsl(var(--color-primary))] font-semibold">{paper.examName} ({paper.subject})</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Exam Date</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unlock Time</label>
              <input
                type="time"
                className="input-field"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Center Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Assign to Exam Centers</label>
            <div className="space-y-3">
              {selectedCenters.map((center, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <select
                    className="input-field flex-1"
                    value={center.centerAddress}
                    onChange={(e) => updateCenterRow(index, 'centerAddress', e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">Select Center...</option>
                    {centers.map((c) => (
                      <option key={c.address} value={c.address}>
                        {c.name} ({c.address.slice(0, 6)}...{c.address.slice(-4)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Classroom / Hall"
                    value={center.classroom}
                    onChange={(e) => updateCenterRow(index, 'classroom', e.target.value)}
                    disabled={loading}
                    required
                  />
                  {selectedCenters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCenterRow(index)}
                      className="btn-outline px-3 py-2 text-red-500"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCenterRow}
              className="btn-outline mt-3 text-xs"
              disabled={loading}
            >
              + Add Another Center
            </button>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleExamModal;
