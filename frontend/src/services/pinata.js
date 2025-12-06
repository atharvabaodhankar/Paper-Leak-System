import axios from 'axios';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

/**
 * Upload a Blob or File to Pinata IPFS
 * @param {Blob|File} file
 * @param {string} fileName
 * @returns {Promise<string>} IPFS CID
 */
export const uploadToIPFS = async (file, fileName) => {
  if (!PINATA_JWT) {
    console.error('Pinata JWT not found in environment variables');
    throw new Error('Pinata configuration missing');
  }

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

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: "Infinity",
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        Authorization: `Bearer ${PINATA_JWT}`
      }
    });
    return res.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
};
