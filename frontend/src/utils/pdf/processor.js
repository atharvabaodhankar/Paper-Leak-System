import { PDFDocument } from 'pdf-lib';
import { generateAESKey, encryptAES } from '../crypto';

const CHUNK_SIZE = 512 * 1024; // 512KB

/**
 * Process a PDF: Chunk it and encrypt each chunk
 * @param {File} file 
 * @returns {Promise<Object>} { chunks: {iv, encryptedData}[], aesKey: string }
 */
export const processPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const aesKey = generateAESKey();
  
  const chunks = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunkData = data.slice(i, i + CHUNK_SIZE);
    const encrypted = encryptAES(chunkData, aesKey);
    chunks.push(encrypted);
  }
  
  return {
    chunks,
    aesKey
  };
};
