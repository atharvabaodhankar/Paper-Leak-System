import { PDFDocument } from 'pdf-lib';
import { generateAESKey, encryptAES } from '../crypto';

const CHUNK_SIZE = 512 * 1024; // 512KB

/**
 * Process a PDF: Chunk it and encrypt each chunk
 * @param {File} file 
 * @param {string} aesKey - Optional AES key, if not provided, generates a new one
 * @returns {Promise<Object>} { chunks: {iv, encryptedData}[], aesKey: string }
 */
export const processPDF = async (file, aesKey = null) => {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  // Use provided key or generate a new one
  const key = aesKey || generateAESKey();
  
  const chunks = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunkData = data.slice(i, i + CHUNK_SIZE);
    const encrypted = await encryptAES(chunkData, key);
    chunks.push(encrypted);
  }
  
  return {
    chunks,
    aesKey: key
  };
};
