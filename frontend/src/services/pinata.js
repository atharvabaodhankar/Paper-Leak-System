import axios from 'axios';
import { uploadToMockIPFS } from './mockIPFS';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

/**
 * Upload a Blob or File to IPFS (tries Pinata first, falls back to mock)
 * @param {Blob|File} file
 * @param {string} fileName
 * @returns {Promise<string>} IPFS CID
 */
export const uploadToIPFS = async (file, fileName) => {
  // Try Pinata first if JWT is available
  if (PINATA_JWT) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: fileName,
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append('pinataOptions', options);

      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxBodyLength: "Infinity",
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          Authorization: `Bearer ${PINATA_JWT}`
        }
      });
      console.log('✅ Uploaded to Pinata IPFS:', res.data.IpfsHash);
      return res.data.IpfsHash;
    } catch (error) {
      console.warn('⚠️ Pinata upload failed, falling back to mock IPFS:', error.message);
    }
  }

  // Fallback to mock IPFS
  console.log('📁 Using mock IPFS for development');
  return await uploadToMockIPFS(file, fileName);
};
