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
    console.log('🔧 Starting PDF reassembly with time-locked key:', {
      cidsCount: cids?.length,
      timeLockedKeyLength: timeLockedKeyJson?.length,
      unlockTimestamp,
      saltLength: salt?.length,
      currentTime: Math.floor(Date.now() / 1000)
    });
    
    // 1. Decrypt the time-locked AES key
    console.log('🔓 Step 1: Decrypting time-locked AES key...');
    const aesKey = await decryptTimeLockedKey(timeLockedKeyJson, unlockTimestamp, salt);
    console.log('✅ AES key decrypted successfully, length:', aesKey.length);
    
    const decryptedChunks = [];
    
    // 2. Fetch and decrypt each chunk
    console.log('📦 Step 2: Fetching and decrypting chunks...');
    for (let i = 0; i < cids.length; i++) {
      const cid = cids[i];
      console.log(`📥 Fetching chunk ${i + 1}/${cids.length}: ${cid}`);
      
      try {
        // Try Dedicated Gateway first (if configured), then Pinata public, then fallback
        let response;
        const dedicatedGateway = import.meta.env.VITE_GATEWAY_URL;
        const gatewayKey = import.meta.env.VITE_GATEWAY_KEY;

        try {
          if (dedicatedGateway && gatewayKey) {
             console.log(`🚀 Using Dedicated Gateway: ${dedicatedGateway}`);
             response = await axios.get(`https://${dedicatedGateway}/ipfs/${cid}?pinataGatewayToken=${gatewayKey}`, {
                withCredentials: false
             });
          } else {
             throw new Error('Dedicated gateway not configured');
          }
        } catch (gatewayError) {
          console.log(`⚠️ Dedicated Gateway failed/missing, trying public gateway for ${cid}:`, gatewayError.message);
          
          try {
             // Try Pinata public gateway
             response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
               withCredentials: false 
             });
          } catch (pinataError) {
             console.log(`📡 Pinata public failed, trying generic fallback for ${cid}:`, pinataError.message);
             // Fallback to generic IPFS gateway
             response = await axios.get(`https://ipfs.io/ipfs/${cid}`, {
               withCredentials: false
             });
          }
        }
        const { iv, encryptedData } = response.data;
        
        console.log(`🔓 Decrypting chunk ${i + 1}:`, {
          ivLength: iv?.length,
          encryptedDataLength: encryptedData?.length
        });
        
        const decryptedChunk = await decryptAES(encryptedData, iv, aesKey);
        decryptedChunks.push(decryptedChunk);
        
        console.log(`✅ Chunk ${i + 1} decrypted successfully, size:`, decryptedChunk.length);
      } catch (chunkError) {
        console.error(`❌ Failed to process chunk ${i + 1}:`, chunkError);
        throw new Error(`Failed to process chunk ${i + 1}: ${chunkError.message}`);
      }
    }
    
    // 3. Merge chunks
    console.log('🔗 Step 3: Merging chunks...');
    const totalLength = decryptedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedArray = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of decryptedChunks) {
      mergedArray.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log('✅ PDF reassembly completed successfully:', {
      totalChunks: decryptedChunks.length,
      totalSize: totalLength,
      finalBlobSize: mergedArray.length
    });
    
    return new Blob([mergedArray], { type: 'application/pdf' });
  } catch (error) {
    console.error('❌ PDF reassembly failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 300)
    });
    throw error;
  }
};
