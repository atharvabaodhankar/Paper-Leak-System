/**
 * Mock IPFS service for testing when Pinata is not available
 * In production, replace this with actual IPFS service
 */

// Simple in-memory storage for demo purposes
const mockStorage = new Map();

/**
 * Mock upload to IPFS - stores data locally and returns a fake CID
 * @param {Blob|File} file 
 * @param {string} fileName 
 * @returns {Promise<string>} Mock IPFS CID
 */
export const uploadToMockIPFS = async (file, fileName) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate a mock CID
  const mockCID = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  // Store the file data (in real implementation, this would go to IPFS)
  const arrayBuffer = await file.arrayBuffer();
  mockStorage.set(mockCID, {
    data: arrayBuffer,
    fileName,
    uploadTime: Date.now()
  });
  
  console.log(`Mock IPFS: Uploaded ${fileName} with CID: ${mockCID}`);
  return mockCID;
};

/**
 * Retrieve data from mock IPFS
 * @param {string} cid 
 * @returns {Promise<ArrayBuffer>}
 */
export const retrieveFromMockIPFS = async (cid) => {
  const stored = mockStorage.get(cid);
  if (!stored) {
    throw new Error(`File not found for CID: ${cid}`);
  }
  return stored.data;
};

/**
 * List all stored files (for debugging)
 * @returns {Array}
 */
export const listMockIPFSFiles = () => {
  return Array.from(mockStorage.entries()).map(([cid, data]) => ({
    cid,
    fileName: data.fileName,
    uploadTime: new Date(data.uploadTime).toISOString()
  }));
};