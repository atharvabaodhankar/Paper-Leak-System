import axios from 'axios';
import { decryptAES, decryptWithPrivateKey } from '../crypto';

/**
 * Reassemble a PDF from encrypted chunks on IPFS
 * @param {string[]} cids List of IPFS CIDs
 * @param {string} encryptedKeyBase64 AES key encrypted with RSA Public Key
 * @param {string} privateKeyPem RSA Private Key
 * @returns {Promise<Blob>} Reassembled PDF Blob
 */
export const reassemblePDF = async (cids, encryptedKeyBase64, privateKeyPem) => {
  try {
    // 1. Decrypt the AES key
    const aesKey = decryptWithPrivateKey(encryptedKeyBase64, privateKeyPem);
    
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
