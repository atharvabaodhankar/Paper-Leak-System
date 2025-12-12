import axios from 'axios';
import { decryptAES, decryptTimeLockedKey } from '../crypto';

/**
 * Reassemble a PDF from encrypted chunks on IPFS using time-locked keys
 * @param {string[]} cids List of IPFS CIDs
 * @param {string} timeLockedKeyJson JSON string of time-locked AES key
 * @param {number} unlockTimestamp Unix timestamp when key unlocks
 * @param {string} salt Salt used for key derivation
 * @returns {Promise<Blob>} Reassembled PDF Blob
 */
export const reassemblePDF = async (cids, timeLockedKeyJson, unlockTimestamp, salt) => {
  try {
    // 1. Decrypt the time-locked AES key
    const aesKey = await decryptTimeLockedKey(timeLockedKeyJson, unlockTimestamp, salt);
    
    const decryptedChunks = [];
    
    // 2. Fetch and decrypt each chunk
    for (const cid of cids) {
      // Pinata gateway or public gateway
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const { iv, encryptedData } = response.data;
      
      const decryptedChunk = await decryptAES(encryptedData, iv, aesKey);
      decryptedChunks.push(decryptedChunk);
    }
    
    // 3. Merge chunks
    const totalLength = decryptedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedArray = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of decryptedChunks) {
      mergedArray.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([mergedArray], { type: 'application/pdf' });
  } catch (error) {
    console.error('Reassembly failed:', error);
    throw error;
  }
};
