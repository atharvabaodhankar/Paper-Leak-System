import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { decryptWithPrivateKey, encryptWithPublicKey } from '../../utils/crypto';
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

      // Decrypt the master AES key using Authority's private key
      const authorityPrivKey = localStorage.getItem(`chainseal_priv_${account}`);
      if (!authorityPrivKey) {
        alert('Authority private key not found. Please generate keys first.');
        setLoading(false);
        return;
      }

      const encryptedMasterKeyBase64 = ethers.utils.toUtf8String(paper.authorityEncryptedKey);
      const masterAESKey = decryptWithPrivateKey(encryptedMasterKeyBase64, authorityPrivKey);

      // Re-encrypt for each selected center
      const centerAddresses = [];
      const classrooms = [];
      const encryptedKeys = [];

      for (const center of validCenters) {
        const centerPubKeyBytes = await contract.getCenterPublicKey(center.centerAddress);
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
